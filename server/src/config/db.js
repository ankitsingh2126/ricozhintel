// MongoDB connection module.
// server.js calls connectDB() once at startup.
// Event listeners log connection state changes so we know what Mongo is doing.

import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async () => {
  // Safety guard: test runner is strictly restricted to the explicitly configured in-memory test database URI
  if (process.env.NODE_ENV === 'test') {
    const isExplicitMemoryUri =
      process.env.IS_TEST_MEMORY_DB === 'true' &&
      Boolean(process.env.TEST_MEMORY_MONGODB_URI) &&
      env.mongoUri === process.env.TEST_MEMORY_MONGODB_URI;

    if (!isExplicitMemoryUri) {
      throw new Error(
        'SAFETY ERROR: Test runner attempted to connect to non-test database. Tests must use an isolated in-memory MongoDB.'
      );
    }
  }

  // Log important connection events. Mongoose emits these on the connection object.
  mongoose.connection.on('connected', () => {
    console.log('[db] MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });

  await mongoose.connect(env.mongoUri);

  return mongoose.connection;
};
