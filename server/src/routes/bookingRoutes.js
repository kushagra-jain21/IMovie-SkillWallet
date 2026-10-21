import { Router } from 'express';
import {
  holdSeats,
  createPaymentOrder,
  confirmBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getTicketData
} from '../controllers/bookingController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/hold', holdSeats);
router.post('/create-order', createPaymentOrder);
router.post('/confirm', confirmBooking);
router.get('/my', getMyBookings);
router.get('/:id', getBookingById);
router.post('/:id/cancel', cancelBooking);
router.get('/:id/ticket', getTicketData);

export default router;
