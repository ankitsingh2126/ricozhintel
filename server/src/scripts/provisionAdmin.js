import readline from 'readline';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

const promptPassword = (query) => {
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

const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      parsed[key] = value;
    }
  }
  return parsed;
};

const run = async () => {
  const args = parseArgs();
  const email = typeof args.email === 'string' ? args.email.trim().toLowerCase() : '';
  let password = process.env.ADMIN_PASSWORD || '';
  const name = typeof args.name === 'string' ? args.name.trim() : 'System Administrator';

  if (!email) {
    console.error('Error: --email is required (e.g. --email admin@example.com)');
    process.exit(1);
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
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('Error: Password must be at least 6 characters.');
    process.exit(1);
  }

  try {
    await mongoose.connect(env.mongoUri);
    const existing = await User.findOne({ email });

    if (existing) {
      existing.role = 'admin';
      existing.password = password; // pre-save hook will hash this securely
      if (name && (!existing.name || existing.name === 'System Administrator')) {
        existing.name = name;
      }
      await existing.save();
      console.log(`[admin:provision] Existing user ${email} successfully promoted to administrator.`);
    } else {
      await User.create({
        name,
        email,
        password, // pre-save hook will hash this securely
        role: 'admin',
      });
      console.log(`[admin:provision] New administrator ${email} created successfully.`);
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(`[admin:provision] Failed to provision admin: ${err.message}`);
    process.exit(1);
  }
};

run();
