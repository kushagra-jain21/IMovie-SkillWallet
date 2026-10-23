import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { logger } from '../utils/logger.js';
import { seatReservationService } from '../services/seatReservationService.js';
import { isOriginAllowed } from '../config/cors.js';

let ioInstance = null;
const socketRateLimitMap = new Map();

const isSocketRateLimited = (socketId, maxEvents = 30, windowMs = 10000) => {
  const now = Date.now();
  const entry = socketRateLimitMap.get(socketId) || { count: 0, windowStart: now };
  if (now - entry.windowStart > windowMs) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count++;
  socketRateLimitMap.set(socketId, entry);
  return entry.count > maxEvents;
};

export const initSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by Socket CORS policy`));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  ioInstance.on('connection', (socket) => {
    logger.debug(`Socket client connected: ${socket.id}`);
    socket.data.joinedShows = new Set();

    // Join room for a specific show with validation and rate limiting
    socket.on('join-show', async ({ showId } = {}) => {
      if (isSocketRateLimited(socket.id)) {
        socket.emit('error', { message: 'Rate limit exceeded on socket events. Please slow down.' });
        return;
      }

      if (!showId || !mongoose.isValidObjectId(showId)) {
        socket.emit('error', { message: 'Invalid showId provided for seat room.' });
        return;
      }

      const room = `show:${showId}`;
      socket.join(room);
      socket.data.joinedShows.add(showId);
      logger.debug(`Socket ${socket.id} joined room ${room}`);

      // Send latest authoritative seat status
      try {
        const seats = await seatReservationService.getShowSeatsAuthoritative(showId);
        socket.emit('seat-availability-updated', { showId, seats });
      } catch (err) {
        logger.error(`Error sending seat availability to socket ${socket.id}:`, err.message);
      }
    });

    // Leave show room with validation
    socket.on('leave-show', ({ showId } = {}) => {
      if (!showId || !mongoose.isValidObjectId(showId)) return;
      const room = `show:${showId}`;
      socket.leave(room);
      socket.data.joinedShows?.delete(showId);
      logger.debug(`Socket ${socket.id} left room ${room}`);
    });

    // Rejoin previously tracked rooms on reconnection
    socket.on('rejoin-shows', async ({ showIds } = {}) => {
      if (isSocketRateLimited(socket.id)) return;
      const targets = Array.isArray(showIds) ? showIds : Array.from(socket.data.joinedShows || []);
      for (const sId of targets) {
        if (sId && mongoose.isValidObjectId(sId)) {
          const room = `show:${sId}`;
          socket.join(room);
          socket.data.joinedShows.add(sId);
          try {
            const seats = await seatReservationService.getShowSeatsAuthoritative(sId);
            socket.emit('seat-availability-updated', { showId: sId, seats });
          } catch (err) {
            // non-fatal on rejoin
          }
        }
      }
    });

    socket.on('disconnect', () => {
      socketRateLimitMap.delete(socket.id);
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
};

export const getIO = () => {
  return ioInstance;
};

/**
 * Broadcast seat hold event to show room
 */
export const broadcastSeatHold = (showId, seatNumbers, expiresAt) => {
  if (!ioInstance) return;
  ioInstance.to(`show:${showId}`).emit('seat-hold-created', {
    showId,
    seatNumbers,
    expiresAt
  });
};

/**
 * Broadcast seat release event
 */
export const broadcastSeatRelease = (showId, seatNumbers) => {
  if (!ioInstance) return;
  ioInstance.to(`show:${showId}`).emit('seat-hold-released', {
    showId,
    seatNumbers
  });
};

/**
 * Broadcast booking confirmation event
 */
export const broadcastBookingConfirmed = (showId, seatNumbers) => {
  if (!ioInstance) return;
  ioInstance.to(`show:${showId}`).emit('booking-confirmed', {
    showId,
    seatNumbers
  });
};
