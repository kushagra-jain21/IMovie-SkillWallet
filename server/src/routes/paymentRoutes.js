import { Router } from 'express';
import { getPaymentStatus, simulatePayment } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/:id/status', getPaymentStatus);
router.post('/simulate', simulatePayment);

export default router;
