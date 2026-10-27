// Test setup.
// Starts an isolated MongoDB in-memory replica set before any test runs,
// enabling full MongoDB ACID transaction support across all test suites,
// and overrides MONGODB_URI so the app connects to it instead of the dev DB.

import { MongoMemoryReplSet } from 'mongodb-memory-server';

let mongoReplSet;

mongoReplSet = await MongoMemoryReplSet.create({
  replSet: { count: 1 },
});
const memoryUri = mongoReplSet.getUri();
process.env.IS_TEST_MEMORY_DB = 'true';
process.env.TEST_MEMORY_MONGODB_URI = memoryUri;
process.env.MONGODB_URI = memoryUri;
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long-for-tests';

afterAll(async () => {
  if (mongoReplSet) {
    await mongoReplSet.stop();
  }
});
