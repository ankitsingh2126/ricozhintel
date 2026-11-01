// Production administrator provisioning script.
// Safe by default: creates a new Administrator account only.
// If the target email already exists, it strictly refuses to overwrite credentials or elevate privileges.

import readline from 'readline';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

export const promptPassword = (query) => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (process.stdin.isTTY) {
      process.stdout.write(query);
      process.stdin.setRawMode?.(true);
      let input = '';
      process.stdin.resume();
      process.stdin.on('data', function onData(char) {
        char = String(char);
        switch (char) {
          case '\n':
          case '\r':
          case '\u0004':
            process.stdin.setRawMode?.(false);
            process.stdin.pause();
            process.stdin.removeListener('data', onData);
            process.stdout.write('\n');
            rl.close();
            resolve(input);
            break;
          case '\u0003': // Ctrl+C
            process.exit(1);
            break;
          case '\u0008':
          case '\x7f': // Backspace
            if (input.length > 0) {
              input = input.slice(0, -1);
            }
            break;
          default:
            input += char;
            break;
        }
      });
    } else {
      rl.question(query, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
};

export const parseArgs = (argv = process.argv.slice(2)) => {
  const parsed = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      parsed[key] = value;
    }
  }
  return parsed;
};

/**
 * Core business logic for provisioning a new administrator account.
 * Rejects if user with the same email already exists (regardless of role).
 * Delegates password hashing to Mongoose User schema pre('save') hook.
 */
export const provisionAdminAccount = async ({ email, password, name = 'System Administrator' }) => {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedName = typeof name === 'string' && name.trim() ? name.trim() : 'System Administrator';

  if (!normalizedEmail) {
    throw new Error('Email is required (e.g. --email admin@example.com)');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new Error('Please provide a valid email address');
  }

  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password is required');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Safety check: Never overwrite an existing user or elevate a Viewer automatically
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new Error(
      `An account with email "${normalizedEmail}" already exists with role "${existing.role}". Provisioning refused: existing accounts cannot be overwritten or promoted.`
    );
  }

  // Create new Administrator account
  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password, // pre-save hook hashes with bcrypt (salt rounds = 10)
    role: 'admin',
    status: 'active',
  });

  return user;
};

export const run = async (argv = process.argv.slice(2), { autoDisconnect = true } = {}) => {
  const args = parseArgs(argv);
  const email = typeof args.email === 'string' ? args.email.trim().toLowerCase() : '';
  let password = process.env.ADMIN_PASSWORD || '';
  const name = typeof args.name === 'string' ? args.name.trim() : 'System Administrator';

  if (!email) {
    console.error('Error: --email is required (e.g. --email admin@example.com)');
    return 1;
  }

  if (!password && typeof args.password === 'string' && args.password.length > 0) {
    console.warn(
      '[admin:provision] SECURITY NOTICE: Passing passwords via command-line arguments can expose secrets in shell history and process lists. Prefer setting the ADMIN_PASSWORD environment variable or using the interactive prompt.'
    );
    password = args.password;
  }

  if (!password && process.stdin.isTTY) {
    password = await promptPassword('Enter administrator password (hidden): ');
  }

  if (!password) {
    console.error('Error: Password is required. Set ADMIN_PASSWORD environment variable or enter at the interactive prompt.');
    return 1;
  }

  if (password.length < 6) {
    console.error('Error: Password must be at least 6 characters.');
    return 1;
  }

  const wasAlreadyConnected = mongoose.connection.readyState === 1;

  try {
    if (!wasAlreadyConnected) {
      await mongoose.connect(env.mongoUri);
    }
    const user = await provisionAdminAccount({ email, password, name });
    console.log(`[admin:provision] New administrator ${user.email} created successfully.`);
    if (autoDisconnect && !wasAlreadyConnected) {
      await mongoose.disconnect();
    }
    return 0;
  } catch (err) {
    console.error(`[admin:provision] Failed to provision admin: ${err.message}`);
    if (autoDisconnect && !wasAlreadyConnected) {
      await mongoose.disconnect().catch(() => {});
    }
    return 1;
  }
};

export const isDirectExecution = () => {
  if (!process.argv[1]) return false;
  try {
    return fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
  } catch {
    return false;
  }
};

if (isDirectExecution()) {
  run().then((code) => {
    process.exit(code ?? 0);
  }).catch((err) => {
    console.error(`[admin:provision] Fatal error: ${err.message}`);
    process.exit(1);
  });
}
