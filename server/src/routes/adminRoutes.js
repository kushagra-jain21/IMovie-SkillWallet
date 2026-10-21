import { Router } from 'express';
import { getDashboardAnalytics, getAllBookings, getAllUsers, toggleUserStatus } from '../controllers/adminController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/analytics', getDashboardAnalytics);
router.get('/bookings', getAllBookings);
router.get('/users', getAllUsers);
router.patch('/users/:id/status', toggleUserStatus);

export default router;
