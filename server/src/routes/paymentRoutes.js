import { Router } from 'express';
import { getPaymentStatus, simulatePayment } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { isProduction } from '../config/environment.js';
import { errorResponse } from '../utils/apiResponse.js';

const router = Router();

// In production, unconditionally disable simulated payments with 403
router.use('/simulate', (req, res, next) => {
  if (isProduction()) {
    return errorResponse(res, 'Payment simulation is disabled in production.', 403);
  }
  next();
});

router.use(authenticate);

router.get('/:id/status', getPaymentStatus);
router.post('/simulate', simulatePayment);

export default router;
