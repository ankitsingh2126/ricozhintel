// Loads and validates environment variables.
// Every other file must import config from here — never read process.env directly.

import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_KEYS = ['PORT', 'NODE_ENV', 'MONGODB_URI', 'CLIENT_ORIGIN'];

if (process.env.NODE_ENV === 'production') {
  REQUIRED_KEYS.push('JWT_SECRET');
}

const missing = REQUIRED_KEYS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error('Missing required environment variables:');
  missing.forEach((key) => console.error(`  - ${key}`));
  console.error('Check your .env file (see .env.example for reference).');
  process.exit(1);
}

export const env = {
  port: Number(process.env.PORT),
  nodeEnv: process.env.NODE_ENV,
  mongoUri: process.env.MONGODB_URI,
  clientOrigin: process.env.CLIENT_ORIGIN,
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-key-ricozhintel-min-32-chars-long',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  isProduction: process.env.NODE_ENV === 'production',
};
