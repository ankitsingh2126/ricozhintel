// Entry point for the Ricozhintel API.
// Connects to MongoDB, then starts the HTTP server.
// Handles graceful shutdown on Ctrl+C and process termination.

import mongoose from 'mongoose';
import { env } from './src/config/env.js';
import { connectDB } from './src/config/db.js';
import { createApp } from './src/app.js';

const start = async () => {
  try {
    await connectDB();

    const app = createApp();
    const server = app.listen(env.port, () => {
      console.log(`[server] Ricozhintel API listening on http://localhost:${env.port}`);
      console.log(`[server] Health check: http://localhost:${env.port}/api/v1/health`);
    });

    const shutdown = async (signal) => {
      console.log(`[server] ${signal} received. Shutting down...`);
      server.close(async () => {
        await mongoose.connection.close();
        console.log('[db] MongoDB connection closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
  }
};

start();
