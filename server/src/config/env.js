// Loads and validates environment variables.
// Every other file must import config from here — never read process.env directly.

import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_KEYS = ['PORT', 'NODE_ENV', 'MONGODB_URI', 'CLIENT_ORIGIN'];

if (process.env.NODE_ENV === 'production') {
  REQUIRED_KEYS.push('JWT_SECRET');
}

const missing = REQUIRED_KEYS.filter((key) => !process.env[key] || process.env[key].trim() === '');

if (missing.length > 0) {
  console.error('Missing required environment variables:');
  missing.forEach((key) => console.error(`  - ${key}`));
  console.error('Check your .env file (see .env.example for reference).');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
    console.error('Security error: In production, JWT_SECRET must be defined and at least 32 characters long.');
    process.exit(1);
  }
}

export const env = {
  get port() { return Number(process.env.PORT); },
  get nodeEnv() { return process.env.NODE_ENV; },
  get mongoUri() { return process.env.MONGODB_URI; },
  get clientOrigin() { return process.env.CLIENT_ORIGIN; },
  get jwtSecret() {
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
        throw new Error('Security error: In production, JWT_SECRET must be defined and at least 32 characters long.');
      }
      return process.env.JWT_SECRET;
    }
    return process.env.JWT_SECRET || 'dev-jwt-secret-key-ricozhintel-min-32-chars-long';
  },
  get jwtExpiresIn() { return process.env.JWT_EXPIRES_IN || '7d'; },
  get adminBootstrapSecret() { return process.env.ADMIN_BOOTSTRAP_SECRET; },
  get isProduction() { return process.env.NODE_ENV === 'production'; },
};
