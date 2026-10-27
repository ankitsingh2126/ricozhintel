// User management service handling queries, user creation, profile updates,
// role modification, and account status toggling with MongoDB ACID transaction safeguards.

import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Ensures the administrative mutation barrier document exists in system_locks before transactions execute.
 * This guarantees contending transactions can execute an atomic write update without creating
 * namespaces or collections inside the transaction.
 */
const ensureMutationBarrier = async () => {
  const locks = mongoose.connection.collection('system_locks');
  await locks.updateOne(
    { _id: 'admin_mutation_barrier' },
    { $setOnInsert: { version: 0, createdAt: new Date() } },
    { upsert: true }
  ).catch(() => {});
};

/**
 * Executes an administrative mutation inside a full MongoDB ACID transaction.
 *
 * Guarantees:
 * 1. Atomicity: Multi-document changes and invariant checks commit or abort together.
 * 2. Write-Skew Prevention (Serializability): Competing transactions write-contend on the shared
 *    'admin_mutation_barrier' document inside the transaction session.
 *    If Transaction 1 is in-flight, Transaction 2 detects a WriteConflict on the barrier and
 *    automatically retries in a new snapshot after Transaction 1 commits.
 * 3. Fresh Snapshot Validation: Inside each retry snapshot, target user state and remaining
 *    active administrator counts are evaluated on the latest committed state.
 * 4. Automatic Rollback: Any operational failure or guard rejection automatically aborts the
 *    transaction, leaving database state completely clean without manual compensation.
 */
export const withAdminMutationTransaction = async (actionFn) => {
  await ensureMutationBarrier();
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      // Materialize conflict on the shared barrier document within this transaction session.
      // This forces MongoDB to serialize concurrent transactions attempting admin mutations,
      // preventing snapshot-isolation write skew where two transactions read at the same snapshot
      // and each deactivates/demotes the other's administrator.
      const locks = mongoose.connection.collection('system_locks');
      await locks.updateOne(
        { _id: 'admin_mutation_barrier' },
        { $inc: { version: 1 }, $set: { updatedAt: new Date() } },
        { session }
      );

      result = await actionFn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

// Backward-compatible alias
export const withAdminMutationLock = withAdminMutationTransaction;

/**
 * Fetch a paginated list of users with optional search and filtering.
 */
export const getUsers = async ({ search, role, status, page = 1, limit = 20 }) => {
  const filter = {};

  if (search && typeof search === 'string' && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  if (role && ['admin', 'viewer'].includes(role)) {
    filter.role = role;
  }

  if (status && ['active', 'inactive'].includes(status)) {
    filter.status = status;
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const total = await User.countDocuments(filter);
  const pages = Math.ceil(total / numericLimit) || 1;

  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip((numericPage - 1) * numericLimit)
    .limit(numericLimit);

  return {
    items: users.map((u) => u.toJSON()),
    meta: {
      page: numericPage,
      limit: numericLimit,
      total,
      pages,
    },
  };
};

/**
 * Fetch a single user by ID.
 */
export const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return user.toJSON();
};

/**
 * Administrative user creation.
 */
export const createUser = async ({ name, email, password, role = 'viewer', status = 'active' }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw ApiError.conflict('A user with this email address already exists');
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role,
    status,
  });

  return user.toJSON();
};

/**
 * Update user profile (name and/or email).
 */
export const updateUser = async (id, { name, email }) => {
  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== user.email) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        throw ApiError.conflict('A user with this email address already exists');
      }
      user.email = normalizedEmail;
    }
  }

  if (name && typeof name === 'string') {
    user.name = name.trim();
  }

  await user.save();
  return user.toJSON();
};

/**
 * Update user role with self-demotion and last-active-admin safeguards enforced atomically.
 */
export const updateUserRole = async (targetUserId, newRole, actorUserId) => {
  // Fast pre-check: prevent self-demotion
  if (
    actorUserId &&
    actorUserId.toString() === targetUserId.toString() &&
    newRole === 'viewer'
  ) {
    throw ApiError.badRequest('Administrators cannot demote their own account');
  }

  return await withAdminMutationTransaction(async (session) => {
    // 1. Re-fetch user fresh inside the transaction session
    const user = await User.findById(targetUserId).session(session);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.role === newRole) {
      return user.toJSON();
    }

    // 2. Re-check self-demotion on fresh database state
    if (
      user.role === 'admin' &&
      newRole === 'viewer' &&
      actorUserId &&
      actorUserId.toString() === targetUserId.toString()
    ) {
      throw ApiError.badRequest('Administrators cannot demote their own account');
    }

    // 3. If demoting an admin, ensure at least one other active admin remains
    if (user.role === 'admin' && newRole === 'viewer') {
      const remainingActiveAdmins = await User.countDocuments({
        _id: { $ne: user._id },
        role: 'admin',
        status: { $ne: 'inactive' },
      }).session(session);

      if (remainingActiveAdmins === 0) {
        throw ApiError.badRequest('Cannot demote the last remaining active administrator');
      }
    }

    user.role = newRole;
    await user.save({ session });
    return user.toJSON();
  });
};

/**
 * Update user account status with self-deactivation and last-active-admin safeguards enforced atomically.
 */
export const updateUserStatus = async (targetUserId, newStatus, actorUserId) => {
  // Fast pre-check: prevent self-deactivation
  if (
    newStatus === 'inactive' &&
    actorUserId &&
    actorUserId.toString() === targetUserId.toString()
  ) {
    throw ApiError.badRequest('Administrators cannot deactivate their own account');
  }

  return await withAdminMutationTransaction(async (session) => {
    // 1. Re-fetch user fresh inside the transaction session
    const user = await User.findById(targetUserId).session(session);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.status === newStatus) {
      return user.toJSON();
    }

    // 2. Re-check self-deactivation on fresh database state
    if (
      newStatus === 'inactive' &&
      actorUserId &&
      actorUserId.toString() === targetUserId.toString()
    ) {
      throw ApiError.badRequest('Administrators cannot deactivate their own account');
    }

    // 3. If deactivating an admin, ensure at least one other active admin remains
    if (user.role === 'admin' && newStatus === 'inactive') {
      const remainingActiveAdmins = await User.countDocuments({
        _id: { $ne: user._id },
        role: 'admin',
        status: { $ne: 'inactive' },
      }).session(session);

      if (remainingActiveAdmins === 0) {
        throw ApiError.badRequest('Cannot deactivate the last remaining active administrator');
      }
    }

    user.status = newStatus;
    await user.save({ session });
    return user.toJSON();
  });
};
