import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env, isProduction, formatMongoUri } from './environment.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mongodInstance = null;
let listenersAttached = false;

/**
 * Sanitizes a MongoDB connection URI for safe logging by masking credentials.
 */
export const maskMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/:([^@]+)@/, ':****@');
};

/**
 * Attaches persistent event listeners to Mongoose connection.
 */
const attachConnectionListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connected', () => {
    logger.info(`MongoDB connection established to host: ${mongoose.connection.host} [db: ${mongoose.connection.name}]`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection lost. Awaiting automatic reconnection...');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB connection re-established successfully.');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });
};

/**
 * Connects to MongoDB with environment validation, retry resilience, and diagnostics.
 */
export const connectDB = async (customUri = null) => {
  // 1. ISOLATED TEST MODE GUARD
  if (process.env.NODE_ENV === 'test') {
    let testUri = customUri || process.env.TEST_MONGODB_URI;

    if (!testUri) {
      const uriFile = path.resolve(__dirname, '../../.test-mongo-uri');
      if (fs.existsSync(uriFile)) {
        testUri = fs.readFileSync(uriFile, 'utf-8').trim();
        process.env.TEST_MONGODB_URI = testUri;
      }
    }

    if (!testUri) {
      throw new Error('TEST ISOLATION ERROR: No in-memory TEST_MONGODB_URI provided in test mode.');
    }

    if (testUri.includes('mongodb+srv') || testUri.includes('mongodb.net')) {
      throw new Error('CRITICAL SECURITY GUARD: Test suite attempted to connect to MongoDB Atlas (mongodb+srv)! Aborting immediately.');
    }

    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    await mongoose.connect(testUri, {
      serverSelectionTimeoutMS: 2000
    });
    logger.info(`Test MongoDB connected to isolated memory instance at: ${testUri}`);
    return mongoose.connection;
  }

  // 2. STANDARD RUNTIME (Development & Production)
  if (mongoose.connection.readyState === 1) {
    logger.info('Reusing existing active MongoDB connection.');
    return mongoose.connection;
  }

  const rawTargetUri = customUri || env.MONGODB_URI;
  if (!rawTargetUri || !rawTargetUri.trim()) {
    throw new Error('CRITICAL CONFIG ERROR: MONGODB_URI environment variable is required but missing.');
  }

  const targetUri = formatMongoUri(rawTargetUri, 'imovies');
  const isAtlas = targetUri.includes('mongodb+srv') || targetUri.includes('.mongodb.net');
  const isCloudHost = isProduction() || Boolean(process.env.RENDER);

  logger.info(`Connecting to MongoDB at: ${maskMongoUri(targetUri)}`);
  attachConnectionListeners();

  try {
    await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: isAtlas || isCloudHost ? 10000 : 5000,
      connectTimeoutMS: 10000,
      maxPoolSize: 20
    });

    logger.info(`MongoDB connected successfully via URI [Host: ${mongoose.connection.host}, DB: ${mongoose.connection.name}].`);
    return mongoose.connection;
  } catch (err) {
    const errorMsg = err.message || '';
    logger.error(`Failed to connect to MongoDB URI (${errorMsg}).`);

    // Diagnostic troubleshooting logs
    if (errorMsg.includes('bad auth') || errorMsg.includes('Authentication failed')) {
      logger.error('❌ MongoDB Atlas Authentication Failed: Invalid username or password in MONGODB_URI. Please verify your Atlas Database Access credentials.');
    } else if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ETIMEDOUT') || errorMsg.includes('connection closed') || errorMsg.includes('whitelist') || errorMsg.includes('alert internal error')) {
      logger.error('❌ MongoDB Atlas Network Timeout / IP Access Denied: Verify that your public IP address is allowed in your MongoDB Atlas Network Access whitelist (or set 0.0.0.0/0 for global access).');
    } else if (errorMsg.includes('querySrv') || errorMsg.includes('ENOTFOUND')) {
      logger.error('❌ MongoDB Atlas DNS Resolution Failure: Could not resolve the Atlas cluster address. Check internet connectivity and DNS configuration.');
    }

    // In production or cloud deployments (Render, Railway, etc.), strictly fail fast
    if (isCloudHost) {
      throw err;
    }

    // In local development: log actionable instructions and start embedded runner so frontend is never broken
    logger.warn('================================================================================');
    logger.warn('⚠️  MONGODB ATLAS CONNECTION CURRENTLY BLOCKED BY IP ACCESS WHITELIST');
    logger.warn('👉 To connect to Atlas: In cloud.mongodb.com -> Network Access -> Add IP -> 0.0.0.0/0');
    logger.warn('🔄 Booting local embedded MongoDB runner so your application works immediately without crashing!');
    logger.warn('================================================================================');

    try {
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
  }
};

/**
 * Gracefully disconnects from MongoDB and stops any embedded runners.
 */
export const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (process.env.NODE_ENV !== 'test' && mongodInstance) {
      await mongodInstance.stop();
      mongodInstance = null;
    }
    logger.info('MongoDB disconnected.');
  } catch (err) {
    logger.error('Error during MongoDB disconnect:', err.message);
  }
};
