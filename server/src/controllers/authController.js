import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { generateAccessToken } from '../utils/token.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { ROLES } from '../utils/constants.js';
import { generateVerificationToken, generateVerificationOtp, hashVerificationValue } from '../utils/crypto.js';
import { emailService } from '../services/emailService.js';
import { env, isProduction } from '../config/environment.js';
import { logger } from '../utils/logger.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return errorResponse(res, 'An account with this email address already exists.', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate cryptographically secure email verification token and 6-digit OTP
    const verificationToken = generateVerificationToken();
    const verificationOtp = generateVerificationOtp();
    const tokenHash = hashVerificationValue(verificationToken);
    const otpHash = hashVerificationValue(verificationOtp);

    const ttlMinutes = parseInt(env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES, 10) || 60;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      phone: phone ? phone.trim() : '',
      role: ROLES.USER,
      isEmailVerified: false,
      emailVerifiedAt: null,
      emailVerificationTokenHash: tokenHash,
      emailVerificationOtpHash: otpHash,
      emailVerificationExpiresAt: expiresAt,
      emailVerificationAttempts: 0,
      emailVerificationLastSentAt: new Date()
    });

    // Send verification email asynchronously
    try {
      await emailService.sendVerificationEmail({
        to: user.email,
        name: user.name,
        token: verificationToken,
        otp: verificationOtp
      });
    } catch (emailErr) {
      logger.error('Failed to send verification email on registration:', emailErr.message);
      // We don't rollback the user, but inform the client that resend may be needed
    }

    // Do NOT issue access token or set auth cookie for unverified accounts
    return successResponse(
      res,
      {
        user: user.toSafeObject(),
        email: user.email,
        requiresVerification: true
      },
      'Registration successful! A verification email has been sent to your email address.',
      201
    );
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token, email, otp } = req.body;

    // Flow 1: Token-based verification (from clickable email link)
    if (token) {
      const tokenHash = hashVerificationValue(token);
      const user = await User.findOne({ emailVerificationTokenHash: tokenHash });

      if (!user) {
        // If email was also passed, check if the account is already verified
        if (email) {
          const verifiedUser = await User.findOne({ email: email.toLowerCase().trim() });
          if (verifiedUser && verifiedUser.isEmailVerified) {
            return successResponse(res, { user: verifiedUser.toSafeObject() }, 'Email is already verified. You can now log in.');
          }
        }
        return errorResponse(res, 'Invalid or expired verification link. Please request a new verification email.', 400, null, 'INVALID_TOKEN');
      }

      // Check token expiration
      if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date()) {
        return errorResponse(res, 'Verification link has expired. Please request a new one.', 400, null, 'TOKEN_EXPIRED');
      }

      // Mark user as verified and invalidate token/OTP fields
      user.isEmailVerified = true;
      user.emailVerifiedAt = new Date();
      user.emailVerificationTokenHash = null;
      user.emailVerificationOtpHash = null;
      user.emailVerificationExpiresAt = null;
      user.emailVerificationAttempts = 0;
      await user.save();

      return successResponse(
        res,
        { user: user.toSafeObject() },
        'Your email address has been verified successfully! You can now log in.'
      );
    }

    // Flow 2: 6-Digit OTP verification
    if (otp && email) {
      const normalizedEmail = email.toLowerCase().trim();
      const user = await User.findOne({ email: normalizedEmail });

      if (!user) {
        return errorResponse(res, 'No account found with this email address.', 404);
      }

      if (user.isEmailVerified) {
        return successResponse(res, { user: user.toSafeObject() }, 'Email is already verified. You can log in.');
      }

      // Rate limit verification attempts (Max 5 attempts before requiring new OTP)
      if (user.emailVerificationAttempts >= 5) {
        return errorResponse(
          res,
          'Maximum verification attempts exceeded. Please request a new verification code.',
          429,
          null,
          'TOO_MANY_ATTEMPTS'
        );
      }

      // Check expiration
      if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
        return errorResponse(res, 'Verification code has expired. Please request a new one.', 400, null, 'OTP_EXPIRED');
      }

      const submittedOtpHash = hashVerificationValue(otp);
      if (user.emailVerificationOtpHash !== submittedOtpHash) {
        user.emailVerificationAttempts = (user.emailVerificationAttempts || 0) + 1;
        await user.save();
        const remainingAttempts = Math.max(0, 5 - user.emailVerificationAttempts);
        return errorResponse(
          res,
          `Invalid verification code. ${remainingAttempts} attempts remaining.`,
          400,
          null,
          { code: 'INVALID_OTP', attemptsRemaining: remainingAttempts }
        );
      }

      // Mark user as verified and invalidate token/OTP
      user.isEmailVerified = true;
      user.emailVerifiedAt = new Date();
      user.emailVerificationTokenHash = null;
      user.emailVerificationOtpHash = null;
      user.emailVerificationExpiresAt = null;
      user.emailVerificationAttempts = 0;
      await user.save();

      return successResponse(
        res,
        { user: user.toSafeObject() },
        'Your email address has been verified successfully! You can now log in.'
      );
    }

    return errorResponse(res, 'Either a verification token or an email with 6-digit OTP code must be provided.', 400);
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return errorResponse(res, 'Email address is required.', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Prevent user enumeration: generic success if user doesn't exist
    if (!user) {
      return successResponse(
        res,
        null,
        'If an account with that email address exists and is unverified, a verification email has been sent.'
      );
    }

    if (user.isEmailVerified) {
      return errorResponse(res, 'This email address is already verified. You can log in directly.', 400, null, 'ALREADY_VERIFIED');
    }

    // Enforce cooldown between resend requests (60 seconds)
    const COOLDOWN_SECONDS = 60;
    if (user.emailVerificationLastSentAt) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(user.emailVerificationLastSentAt).getTime()) / 1000);
      if (elapsedSeconds < COOLDOWN_SECONDS) {
        const retryAfter = COOLDOWN_SECONDS - elapsedSeconds;
        return errorResponse(
          res,
          `Please wait ${retryAfter} second${retryAfter === 1 ? '' : 's'} before requesting another verification email.`,
          429,
          null,
          { code: 'COOLDOWN_ACTIVE', retryAfter }
        );
      }
    }

    // Generate new token & OTP and invalidate old ones
    const verificationToken = generateVerificationToken();
    const verificationOtp = generateVerificationOtp();
    const tokenHash = hashVerificationValue(verificationToken);
    const otpHash = hashVerificationValue(verificationOtp);
    const ttlMinutes = parseInt(env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES, 10) || 60;

    user.emailVerificationTokenHash = tokenHash;
    user.emailVerificationOtpHash = otpHash;
    user.emailVerificationExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    user.emailVerificationAttempts = 0;
    user.emailVerificationLastSentAt = new Date();
    await user.save();

    await emailService.sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: verificationToken,
      otp: verificationOtp
    });

    return successResponse(res, null, 'A new verification email has been sent to your email address.');
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return errorResponse(res, 'Invalid email or password credentials.', 401);
    }

    if (user.accountStatus === 'suspended') {
      return errorResponse(res, 'Your account is suspended. Please contact customer support.', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid email or password credentials.', 401);
    }

    // Block unverified users from logging in
    if (!user.isEmailVerified) {
      return errorResponse(
        res,
        'Your email address is not verified. Please verify your email before logging in.',
        403,
        null,
        {
          code: 'EMAIL_NOT_VERIFIED',
          email: user.email
        }
      );
    }

    const token = generateAccessToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: isProduction() ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return successResponse(
      res,
      {
        user: user.toSafeObject(),
        token
      },
      'Welcome back! Login successful.'
    );
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  return successResponse(res, { user: req.user.toSafeObject() });
};

export const logout = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? 'none' : 'lax'
  });
  return successResponse(res, null, 'Logged out successfully.');
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();
    return successResponse(res, { user: user.toSafeObject() }, 'Profile updated successfully.');
  } catch (error) {
    next(error);
  }
};
