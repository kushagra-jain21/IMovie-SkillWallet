import http from 'http';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/environment.js';
import { initSocket } from './sockets/socketHandler.js';
import { startSeatExpiryJob, stopSeatExpiryJob } from './jobs/seatExpiryJob.js';
import { logger } from './utils/logger.js';
import { Theatre } from './models/Theatre.js';
import { seedDatabase } from './scripts/seed.js';

const httpServer = http.createServer(app);

// Initialize Socket.IO
initSocket(httpServer, env.CLIENT_URL);

const startServer = async () => {
  try {
    // Connect to database (with automatic in-memory fallback for instant dev execution)
    await connectDB();

    // In development or when the database is empty, automatically seed verified baseline multiplexes & catalog
    const activeTheatreCount = await Theatre.countDocuments({ isActive: true });
    if (activeTheatreCount === 0) {
      logger.info('No active theatres detected in database. Auto-seeding verified Mumbai cinema inventory and initial catalog...');
      await seedDatabase({ reset: false, closeConnection: false });
    }

    // Start background job for releasing expired seat holds
    startSeatExpiryJob(15000);

    // Listen on configured port
    httpServer.listen(env.PORT, () => {
      logger.info(`=================================================`);
      logger.info(`🎬 IMovies Server running at http://localhost:${env.PORT}`);
      logger.info(`⚡ Socket.IO listening on port ${env.PORT}`);
      logger.info(`💳 Payment Provider: ${env.PAYMENT_PROVIDER}`);
      logger.info(`🌐 Environment: ${env.NODE_ENV}`);
      logger.info(`=================================================`);
    });
  } catch (error) {
    logger.error('Failed to start IMovies server:', error.message);
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
