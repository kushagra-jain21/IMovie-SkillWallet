import mongoose from 'mongoose';
import { env } from './environment.js';
import { logger } from '../utils/logger.js';

let mongodInstance = null;

export const connectDB = async (customUri = null) => {
  const targetUri = customUri || env.MONGODB_URI;

  try {
    // Use resilient timeout for remote MongoDB Atlas connections (15s in production, 5s in dev)
    await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: env.NODE_ENV === 'production' ? 15000 : 5000
    });
    logger.info('MongoDB connected successfully via URI.');
    return mongoose.connection;
  } catch (err) {
    logger.warn(`Could not connect to configured MongoDB URI (${err.message}).`);

    // In non-production, fall back to mongodb-memory-server so app runs with zero external barriers
    if (env.NODE_ENV !== 'production') {
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
