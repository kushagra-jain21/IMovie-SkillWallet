import mongoose from 'mongoose';
import { env } from './environment.js';
import { logger } from '../utils/logger.js';

let mongodInstance = null;

export const connectDB = async (customUri = null) => {
  const targetUri = customUri || env.MONGODB_URI;

  const isCloudHost = env.NODE_ENV === 'production' || Boolean(process.env.RENDER);
  logger.info(`Connecting to MongoDB at: ${targetUri.replace(/:([^@]+)@/, ':****@')}`);

  try {
    // Use resilient timeout for remote MongoDB Atlas connections (15s in production, 5s in dev)
    await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: isCloudHost ? 15000 : 5000
    });
    logger.info('MongoDB connected successfully via URI.');
    return mongoose.connection;
  } catch (err) {
    logger.warn(`Could not connect to configured MongoDB URI (${err.message}).`);

    // In non-production and non-cloud environments, fall back to mongodb-memory-server
    if (!isCloudHost) {
      try {
        logger.info('Starting embedded MongoDB instance (mongodb-memory-server) for seamless local execution...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongodInstance = await MongoMemoryServer.create();
        const memUri = mongodInstance.getUri();
        await mongoose.connect(memUri);
        logger.info(`Embedded MongoDB running & connected at: ${memUri}`);
        return mongoose.connection;
      } catch (memErr) {
        logger.error('Failed to initialize embedded MongoDB fallback:', memErr.message);
        throw err;
      }
    } else {
      logger.error('CRITICAL: Cannot connect to MongoDB in production/cloud environment. Please check your MONGODB_URI and Atlas IP Access List.');
      throw err;
    }
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
    logger.info('MongoDB disconnected.');
  } catch (err) {
    logger.error('Error during MongoDB disconnect:', err.message);
  }
};
