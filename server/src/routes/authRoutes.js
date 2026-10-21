import { Router } from 'express';
import {
  register,
  login,
  getMe,
  logout,
  updateProfile,
  verifyEmail,
  resendVerification
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter, verificationLimiter, resendLimiter } from '../middleware/rateLimiter.js';
import {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  verifyEmailValidator,
  resendVerificationValidator
} from '../validators/authValidator.js';

const router = Router();

router.post('/register', authLimiter, registerValidator, register);
router.post('/verify-email', verificationLimiter, verifyEmailValidator, verifyEmail);
router.post('/resend-verification', resendLimiter, resendVerificationValidator, resendVerification);
router.post('/login', authLimiter, loginValidator, login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.patch('/profile', authenticate, updateProfileValidator, updateProfile);

export default router;
