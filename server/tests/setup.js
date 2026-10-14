// Test setup.
// Starts an isolated MongoDB in memory before any test runs,
// and overrides MONGODB_URI so the app connects to it instead of the dev DB.

import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

mongoServer = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongoServer.getUri();
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

afterAll(async () => {
  if (mongoServer) {
    await mongoServer.stop();
  }
});
