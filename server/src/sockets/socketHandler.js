import { Server } from 'socket.io';
import { logger } from '../utils/logger.js';
import { seatReservationService } from '../services/seatReservationService.js';
import { isOriginAllowed } from '../config/cors.js';

let ioInstance = null;

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

    // Join room for a specific show
    socket.on('join-show', async ({ showId }) => {
      if (!showId) return;
      const room = `show:${showId}`;
      socket.join(room);
      logger.debug(`Socket ${socket.id} joined room ${room}`);

      // Send latest authoritative seat status
      try {
        const seats = await seatReservationService.getShowSeatsAuthoritative(showId);
        socket.emit('seat-availability-updated', { showId, seats });
      } catch (err) {
        logger.error(`Error sending seat availability to socket ${socket.id}:`, err.message);
      }
    });

    // Leave show room
    socket.on('leave-show', ({ showId }) => {
      if (!showId) return;
      const room = `show:${showId}`;
      socket.leave(room);
      logger.debug(`Socket ${socket.id} left room ${room}`);
    });

    socket.on('disconnect', () => {
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
