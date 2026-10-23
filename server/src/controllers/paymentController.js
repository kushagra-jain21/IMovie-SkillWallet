import { Payment } from '../models/Payment.js';
import { paymentService } from '../services/paymentService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { isProduction } from '../config/environment.js';

export const getPaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id).populate('booking');
    if (!payment) {
      return errorResponse(res, 'Payment record not found.', 404);
    }

    if (payment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return errorResponse(res, 'Access denied.', 403);
    }

    return successResponse(res, payment);
  } catch (error) {
    next(error);
  }
};

export const simulatePayment = async (req, res, next) => {
  try {
    if (isProduction()) {
      return errorResponse(res, 'Payment simulation is disabled in production.', 403);
    }

    const { orderId, method = 'card', shouldFail = false } = req.body;

    if (!orderId) {
      return errorResponse(res, 'orderId is required for payment simulation.', 400);
    }

    if (shouldFail) {
      return errorResponse(res, 'Simulated payment was declined by issuing bank.', 400);
    }

    const paymentId = `SIM_PAY_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    return successResponse(
      res,
      {
        orderId,
        paymentId,
        method,
        status: 'success',
        verified: true,
        timestamp: new Date()
      },
      'Simulated payment processed successfully.'
    );
  } catch (error) {
    next(error);
  }
};
