// MongoDB connection module.
// server.js calls connectDB() once at startup.
// Event listeners log connection state changes so we know what Mongo is doing.

import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async () => {
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
