import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/environment.js';
import { User } from '../models/User.js';
import { ROLES } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

const createAdmin = async () => {
  try {
    await connectDB();

    const email = env.ADMIN_SEED_EMAIL.toLowerCase();
    const existing = await User.findOne({ email });

    if (existing) {
      let updated = false;
      if (existing.role !== ROLES.ADMIN) {
        existing.role = ROLES.ADMIN;
        updated = true;
      }
      if (!existing.isEmailVerified) {
        existing.isEmailVerified = true;
        existing.emailVerifiedAt = new Date();
        updated = true;
      }
      if (updated) {
        await existing.save();
        logger.info(`Updated existing user ${email} (Admin role & verified email).`);
      } else {
        logger.info(`Admin user ${email} already exists, verified, and is active.`);
      }
    } else {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(env.ADMIN_SEED_PASSWORD, salt);

      const adminUser = await User.create({
        name: env.ADMIN_SEED_NAME,
        email,
        passwordHash,
        phone: env.ADMIN_SEED_PHONE,
        role: ROLES.ADMIN,
        accountStatus: 'active',
        isEmailVerified: true,
        emailVerifiedAt: new Date()
      });

      logger.info(`Successfully created initial Administrator account:`);
      logger.info(`Email: ${adminUser.email}`);
      logger.info(`Role: ${adminUser.role}`);
    }

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    logger.error('Failed to create admin user:', error.message);
    process.exit(1);
  }
};

createAdmin();
