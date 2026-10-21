import { verifyAccessToken } from '../utils/token.js';
import { User } from '../models/User.js';
import { errorResponse } from '../utils/apiResponse.js';
import { ROLES } from '../utils/constants.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    // 2. Fallback to cookie
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return errorResponse(res, 'Authentication required. Please log in.', 401);
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || !decoded.id) {
      return errorResponse(res, 'Session expired or invalid token. Please log in again.', 401);
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return errorResponse(res, 'User associated with token no longer exists.', 401);
    }

    if (user.accountStatus === 'suspended') {
      return errorResponse(res, 'Your account has been suspended. Please contact support.', 403);
    }

    if (!user.isEmailVerified) {
      return errorResponse(
        res,
        'Email verification required. Please verify your email before accessing this service.',
        403,
        null,
        'EMAIL_NOT_VERIFIED'
      );
    }

    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, 'Authentication error.', 401, error.message);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized.', 401);
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 'Access denied. You do not have permission to perform this action.', 403);
    }

    next();
  };
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded && decoded.id) {
        const user = await User.findById(decoded.id);
        if (user && user.accountStatus !== 'suspended') {
          req.user = user;
        }
      }
    }
  } catch (err) {
    // Ignore error for optional authentication
  }
  next();
};

export const requireAdmin = authorize(ROLES.ADMIN);
