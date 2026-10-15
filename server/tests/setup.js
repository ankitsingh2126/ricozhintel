// Test setup.
// Starts an isolated MongoDB in memory before any test runs,
// and overrides MONGODB_URI so the app connects to it instead of the dev DB.

import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

mongoServer = await MongoMemoryServer.create();
const memoryUri = mongoServer.getUri();
process.env.IS_TEST_MEMORY_DB = 'true';
process.env.TEST_MEMORY_MONGODB_URI = memoryUri;
process.env.MONGODB_URI = memoryUri;
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long-for-tests';

afterAll(async () => {
  if (mongoServer) {
    await mongoServer.stop();
  }
});
