import { connectDB, disconnectDB } from '../config/db.js';
import { Theatre } from '../models/Theatre.js';
import { Screen } from '../models/Screen.js';
import { Movie } from '../models/Movie.js';
import { logger } from '../utils/logger.js';

async function verifyDb() {
  await connectDB();
  logger.info('Connected to MongoDB database.');

  const theatres = await Theatre.find({ isActive: true }).sort({ city: 1, name: 1 });
  logger.info(`--- ACTIVE THEATRES IN DATABASE (${theatres.length}) ---`);
  for (const t of theatres) {
    const screens = await Screen.find({ theatre: t._id, isActive: true });
    logger.info(
      `• [${t.city}, ${t.state}] ${t.name} (ID: ${t._id}) - Screens: ${screens.length}`
    );
  }

  const testTheatres = await Theatre.find({
    $or: [
      { name: { $regex: /concurrency/i } },
      { name: { $regex: /test/i } }
    ]
  });
  logger.info(`--- TEST THEATRES DETECTED IN DB: ${testTheatres.length} ---`);

  const testMovies = await Movie.find({
    $or: [
      { title: { $regex: /concurrency/i } }
    ]
  });
  logger.info(`--- TEST MOVIES DETECTED IN DB: ${testMovies.length} ---`);

  await disconnectDB();
  logger.info('Database verification completed.');
}

verifyDb().catch((err) => {
  logger.error('Verification error:', err.message);
  process.exit(1);
});
