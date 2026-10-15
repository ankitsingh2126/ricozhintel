// Authentication business logic: registration, login, and token generation.

import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
};

export const register = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.conflict('A user with this email address already exists');
  }

  // In production, public registration is strictly 'viewer' role to prevent privilege escalation.
  // In development and test environments, auto-promote the very first registered user to admin
  // so local development and automated test suites bootstrap seamlessly without manual commands.
  const count = await User.countDocuments();
  const assignedRole = (!env.isProduction && count === 0) ? 'admin' : 'viewer';

  const user = await User.create({
    name,
    email,
    password,
    role: assignedRole,
  });

  const token = generateToken(user);
  return {
    user: user.toJSON(),
    token,
  };
};

export const bootstrapAdmin = async ({ name, email, password, bootstrapSecret }) => {
  // Fail closed if ADMIN_BOOTSTRAP_SECRET is missing, blank, or does not match
  const configuredSecret = env.adminBootstrapSecret;
  if (
    !configuredSecret ||
    typeof configuredSecret !== 'string' ||
    configuredSecret.trim().length === 0 ||
    typeof bootstrapSecret !== 'string' ||
    bootstrapSecret !== configuredSecret
  ) {
    throw ApiError.forbidden('Invalid or unconfigured admin bootstrap secret');
  }

  // Pre-check if an administrator already exists
  const adminExists = await User.exists({ role: 'admin' });
  if (adminExists) {
    throw ApiError.forbidden('An administrator has already been provisioned');
  }

  // Atomic race-condition prevention:
  // Insert a unique singleton document with _id: 'admin_bootstrap' in the system_locks collection.
  // In MongoDB, the unique primary key constraint on _id is atomic across concurrent operations.
  // Exactly one concurrent request will succeed; all others fail with duplicate key (E11000).
  const locksCollection = mongoose.connection.collection('system_locks');
  let lockAcquired = false;
  try {
    await locksCollection.insertOne({
      _id: 'admin_bootstrap',
      createdAt: new Date(),
      targetEmail: email,
    });
    lockAcquired = true;
  } catch (err) {
    if (err.code === 11000) {
      throw ApiError.forbidden('An administrator has already been provisioned');
    }
    throw err;
  }

  let adminPersisted = false;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      existingUser.role = 'admin';
      await existingUser.save();
      adminPersisted = true;
      const token = generateToken(existingUser);
      return { user: existingUser.toJSON(), token };
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'admin',
    });
    adminPersisted = true;

    const token = generateToken(user);
    return {
      user: user.toJSON(),
      token,
    };
  } catch (creationError) {
    // Only release the lock if user creation failed before any admin record was persisted.
    // If an admin already exists in the database, the lock MUST NOT be released.
    if (lockAcquired && !adminPersisted) {
      const anyAdminExists = await User.exists({ role: 'admin' }).catch(() => true);
      if (!anyAdminExists) {
        await locksCollection.deleteOne({ _id: 'admin_bootstrap' }).catch(() => {});
      }
    }
    throw creationError;
  }
};

export const updateUserRole = async (userId, newRole) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  user.role = newRole;
  await user.save();
  return user.toJSON();
};

export const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const token = generateToken(user);
  return {
    user: user.toJSON(),
    token,
  };
};

export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return user.toJSON();
};
