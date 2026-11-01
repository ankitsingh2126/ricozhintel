// Tests for hardened administrator provisioning script (provisionAdmin.js).
// Verifies:
// - Creating a new Admin successfully with bcrypt password hashing
// - Refusing existing Viewer accounts without modifying role, password, name, or status
// - Refusing existing Admin accounts without modifying credentials or data
// - Validating required fields (email format, password length >= 6)
// - CLI argument parsing and environment variable handling

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import {
  provisionAdminAccount,
  parseArgs,
  run,
} from '../src/scripts/provisionAdmin.js';

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Hardened Administrator Provisioning (provisionAdmin.js)', () => {
  describe('provisionAdminAccount - Core Function', () => {
    test('creates a new Administrator successfully with hashed password and active status', async () => {
      const email = 'newadmin@ricozhintel.internal';
      const plainPassword = 'SuperSecret123!';
      const name = 'New Admin';

      const user = await provisionAdminAccount({
        email,
        password: plainPassword,
        name,
      });

      expect(user).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.name).toBe(name);
      expect(user.role).toBe('admin');
      expect(user.status).toBe('active');

      // Verify the password is stored as a bcrypt hash and matches
      const fetched = await User.findOne({ email }).select('+password');
      expect(fetched).toBeDefined();
      expect(fetched.password).not.toBe(plainPassword);
      expect(fetched.password).toMatch(/^\$2[aby]\$\d{2}\$/);

      const isMatch = await bcrypt.compare(plainPassword, fetched.password);
      expect(isMatch).toBe(true);
    });

    test('refuses to overwrite an existing Viewer account and preserves its role and password', async () => {
      const viewerEmail = 'viewer@ricozhintel.internal';
      const originalPassword = 'OriginalViewerPass123!';

      // Create an existing Viewer
      const existingViewer = await User.create({
        name: 'Existing Viewer',
        email: viewerEmail,
        password: originalPassword,
        role: 'viewer',
        status: 'active',
      });

      const originalHash = (await User.findById(existingViewer._id).select('+password')).password;

      // Attempt to provision admin with the same email
      await expect(
        provisionAdminAccount({
          email: viewerEmail,
          password: 'NewAdminAttempt123!',
          name: 'Hijacked Admin',
        })
      ).rejects.toThrow(
        /An account with email "viewer@ricozhintel\.internal" already exists with role "viewer"/
      );

      // Verify that the existing user record was NOT changed in any way
      const refreshedViewer = await User.findById(existingViewer._id).select('+password');
      expect(refreshedViewer.role).toBe('viewer'); // Must NOT be elevated to admin
      expect(refreshedViewer.name).toBe('Existing Viewer');
      expect(refreshedViewer.status).toBe('active');
      expect(refreshedViewer.password).toBe(originalHash);

      // Verify the original password still works and the attempted new password does not
      const originalMatches = await bcrypt.compare(originalPassword, refreshedViewer.password);
      const newMatches = await bcrypt.compare('NewAdminAttempt123!', refreshedViewer.password);
      expect(originalMatches).toBe(true);
      expect(newMatches).toBe(false);
    });

    test('refuses to overwrite an existing Administrator account and preserves existing credentials', async () => {
      const adminEmail = 'existingadmin@ricozhintel.internal';
      const originalPassword = 'OriginalAdminPass123!';

      // Create an existing Admin
      const existingAdmin = await User.create({
        name: 'First Admin',
        email: adminEmail,
        password: originalPassword,
        role: 'admin',
        status: 'active',
      });

      const originalHash = (await User.findById(existingAdmin._id).select('+password')).password;

      // Attempt to re-provision the same admin
      await expect(
        provisionAdminAccount({
          email: adminEmail,
          password: 'DifferentPassword123!',
          name: 'Renamed Admin',
        })
      ).rejects.toThrow(
        /An account with email "existingadmin@ricozhintel\.internal" already exists with role "admin"/
      );

      // Verify credentials and name remain unchanged
      const refreshedAdmin = await User.findById(existingAdmin._id).select('+password');
      expect(refreshedAdmin.role).toBe('admin');
      expect(refreshedAdmin.name).toBe('First Admin');
      expect(refreshedAdmin.password).toBe(originalHash);

      const originalMatches = await bcrypt.compare(originalPassword, refreshedAdmin.password);
      expect(originalMatches).toBe(true);
    });

    test('validates email requirement and format', async () => {
      await expect(
        provisionAdminAccount({
          email: '',
          password: 'ValidPassword123!',
        })
      ).rejects.toThrow(/Email is required/);

      await expect(
        provisionAdminAccount({
          email: 'invalid-email-format',
          password: 'ValidPassword123!',
        })
      ).rejects.toThrow(/Please provide a valid email address/);
    });

    test('validates password requirement and minimum length', async () => {
      await expect(
        provisionAdminAccount({
          email: 'valid@test.internal',
          password: '',
        })
      ).rejects.toThrow(/Password is required/);

      await expect(
        provisionAdminAccount({
          email: 'valid@test.internal',
          password: '12345', // only 5 characters
        })
      ).rejects.toThrow(/Password must be at least 6 characters/);
    });

    test('normalizes email by trimming and converting to lowercase', async () => {
      const user = await provisionAdminAccount({
        email: '  MixedCase.Admin@Test.INTERNAL  ',
        password: 'ValidPassword123!',
        name: 'Normalized Admin',
      });

      expect(user.email).toBe('mixedcase.admin@test.internal');

      const found = await User.findOne({ email: 'mixedcase.admin@test.internal' });
      expect(found).toBeDefined();
    });
  });

  describe('parseArgs helper', () => {
    test('parses --email, --password, and --name flags correctly', () => {
      const argv = ['--email', 'ops@ricozhintel.internal', '--name', 'DevOps Admin', '--password', 'Pass123!'];
      const parsed = parseArgs(argv);

      expect(parsed.email).toBe('ops@ricozhintel.internal');
      expect(parsed.name).toBe('DevOps Admin');
      expect(parsed.password).toBe('Pass123!');
    });

    test('handles boolean flags when value is omitted', () => {
      const parsed = parseArgs(['--help', '--verbose']);
      expect(parsed.help).toBe(true);
      expect(parsed.verbose).toBe(true);
    });
  });

  describe('run - CLI Workflow Execution', () => {
    let originalEnvPass;

    beforeEach(() => {
      originalEnvPass = process.env.ADMIN_PASSWORD;
      delete process.env.ADMIN_PASSWORD;
    });

    afterAll(() => {
      if (originalEnvPass !== undefined) {
        process.env.ADMIN_PASSWORD = originalEnvPass;
      } else {
        delete process.env.ADMIN_PASSWORD;
      }
    });

    test('provisions admin successfully via CLI argument workflow', async () => {
      process.env.ADMIN_PASSWORD = 'EnvPassword123!';

      const exitCode = await run(['--email', 'cliadmin@ricozhintel.internal', '--name', 'CLI Admin']);

      expect(exitCode).toBe(0);

      const created = await User.findOne({ email: 'cliadmin@ricozhintel.internal' }).select('+password');
      expect(created).toBeDefined();
      expect(created.name).toBe('CLI Admin');
      expect(created.role).toBe('admin');

      const isMatch = await bcrypt.compare('EnvPassword123!', created.password);
      expect(isMatch).toBe(true);
    });

    test('sets exitCode to 1 when target email already exists', async () => {
      await User.create({
        name: 'Existing Member',
        email: 'member@ricozhintel.internal',
        password: 'Password123!',
        role: 'viewer',
      });

      process.env.ADMIN_PASSWORD = 'EnvPassword123!';

      const exitCode = await run(['--email', 'member@ricozhintel.internal']);

      expect(exitCode).toBe(1);

      // Verify the user remains viewer
      const after = await User.findOne({ email: 'member@ricozhintel.internal' });
      expect(after.role).toBe('viewer');
    });

    test('sets exitCode to 1 when email argument is missing', async () => {
      process.env.ADMIN_PASSWORD = 'Password123!';

      const exitCode = await run([]);

      expect(exitCode).toBe(1);
    });

    test('sets exitCode to 1 when password is too short', async () => {
      const exitCode = await run(['--email', 'shortpass@test.internal', '--password', '123']);

      expect(exitCode).toBe(1);
    });
  });
});
