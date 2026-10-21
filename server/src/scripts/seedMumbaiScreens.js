import { connectDB, disconnectDB } from '../config/db.js';
import { Theatre } from '../models/Theatre.js';
import { Screen } from '../models/Screen.js';
import { logger } from '../utils/logger.js';

const createScreenLayout = (numRows = 6, seatsPerRow = 10) => {
  const rows = [];
  const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, numRows);
  for (let r = 0; r < rowLetters.length; r++) {
    const letter = rowLetters[r];
    const category = r < 2 ? 'SILVER' : r < 5 ? 'GOLD' : 'PLATINUM';
    const priceMultiplier = category === 'SILVER' ? 1.0 : category === 'GOLD' ? 1.3 : 1.8;
    const seats = [];
    for (let s = 1; s <= seatsPerRow; s++) {
      seats.push({
        seatNumber: `${letter}${s}`,
        number: s,
        isAisle: s === 3 || s === seatsPerRow - 2
      });
    }
    rows.push({
      rowLetter: letter,
      category,
      priceMultiplier,
      seats
    });
  }
  return { rows };
};

const seedScreens = async () => {
  try {
    await connectDB();
    const mumbaiTheatres = await Theatre.find({ city: 'Mumbai', isActive: true });

    for (const t of mumbaiTheatres) {
      const existingScreens = await Screen.countDocuments({ theatre: t._id });
      if (existingScreens === 0) {
        logger.info(`Creating screens for ${t.name}...`);
        await Screen.create([
          {
            theatre: t._id,
            name: 'Audi 1 - 4K Laser Atmos',
            screenType: 'Dolby Atmos',
            totalSeats: 60,
            seatingLayout: createScreenLayout(6, 10),
            isActive: true
          },
          {
            theatre: t._id,
            name: 'Audi 2 - IMAX Experience',
            screenType: 'IMAX',
            totalSeats: 60,
            seatingLayout: createScreenLayout(6, 10),
            isActive: true
          }
        ]);
        logger.info(`Created 2 screens for ${t.name}`);
      } else {
        logger.info(`${t.name} already has ${existingScreens} screens.`);
      }
    }

    await disconnectDB();
    logger.info('Screen seeding completed.');
  } catch (err) {
    logger.error('Failed to seed screens:', err);
    process.exit(1);
  }
};

seedScreens();
