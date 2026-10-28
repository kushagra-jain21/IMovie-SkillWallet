import http from 'http';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env, isProduction } from './config/environment.js';
import { initSocket } from './sockets/socketHandler.js';
import { startSeatExpiryJob, stopSeatExpiryJob } from './jobs/seatExpiryJob.js';
import { logger } from './utils/logger.js';
import { Theatre } from './models/Theatre.js';
import { seedDatabase } from './scripts/seed.js';

const httpServer = http.createServer(app);

// Initialize Socket.IO with CORS origins
initSocket(httpServer);

const startServer = async () => {
  try {
    // 1. Establish database connection before accepting any incoming requests
    await connectDB();

    // 2. Dev mode: Auto-seed initial catalog if Atlas database has no theatres
    if (!isProduction()) {
      const activeTheatreCount = await Theatre.countDocuments({ isActive: true });
      if (activeTheatreCount === 0) {
        logger.info('No active theatres detected in database. Initializing cinema catalog and inventory...');
        await seedDatabase({ reset: false, closeConnection: false });
      }
    }

    // 3. Start background job for releasing expired seat holds
    startSeatExpiryJob(15000);

    // 4. Start HTTP & Socket.IO server only after database is ready
    httpServer.listen(env.PORT, () => {
      logger.info(`=================================================`);
      logger.info(`🎬 IMovies Server running at port ${env.PORT}`);
      logger.info(`⚡ Socket.IO listening on port ${env.PORT}`);
      logger.info(`💳 Payment Provider: ${env.PAYMENT_PROVIDER}`);
      logger.info(`🌐 Environment: ${env.NODE_ENV}`);
      logger.info(`💾 Database: ${mongoose.connection.host} / ${mongoose.connection.name}`);
      logger.info(`=================================================`);
    });
  } catch (error) {
    logger.error(`CRITICAL: Database connection or server initialization failed: ${error.message}`);
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  stopSeatExpiryJob();
  httpServer.close(async () => {
    logger.info('HTTP server closed.');
    await disconnectDB();
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
