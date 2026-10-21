import { connectDB, disconnectDB } from '../config/db.js';
import { Movie } from '../models/Movie.js';
import { Theatre } from '../models/Theatre.js';
import { Screen } from '../models/Screen.js';
import { Show } from '../models/Show.js';
import { ShowSeat } from '../models/ShowSeat.js';
import { Booking } from '../models/Booking.js';
import { logger } from '../utils/logger.js';

export const realisticMumbaiTheatres = [
  {
    name: 'IMovies Grand IMAX & Luxe',
    slug: 'imovies-grand-imax-luxe-mumbai',
    description: 'Flagship cinema destination in BKC featuring India\'s largest laser projection screen, plush recliners, and gourmet in-seat dining.',
    address: 'Bandra-Kurla Complex, Bandra East',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400051',
    amenities: ['IMAX Laser 4K', 'Dolby Atmos 128 Channel', 'Recliner Loungers', 'In-Seat Butler Service', 'Valet Parking']
  },
  {
    name: 'IMovies Premiere Palladium',
    slug: 'imovies-premiere-palladium-lower-parel',
    description: 'Ultra-luxurious multiplex in Lower Parel boasting Barco 4K laser projection, immersive acoustic geometry, and an artisanal confectionery.',
    address: 'High Street Phoenix, Senapati Bapat Marg, Lower Parel',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400013',
    amenities: ['Dolby Atmos', '4K Laser Projection', 'VIP Recliner Section', 'Artisanal Cafe', 'Wheelchair Access']
  },
  {
    name: 'IMovies Infinity Cineplex',
    slug: 'imovies-infinity-cineplex-malad',
    description: 'State-of-the-art suburban entertainment hub featuring 4DX environmental effects and Dolby surround sound in Malad West.',
    address: 'Infiniti Mall, New Link Road, Malad West',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400064',
    amenities: ['4DX Motion Seats', 'Dolby Atmos', 'Laser 3D', 'Gaming Arcade', 'Reserved Parking']
  },
  {
    name: 'IMovies Metro Heritage',
    slug: 'imovies-metro-heritage-marine-lines',
    description: 'Historic cinema theatre in South Mumbai modernized with cutting-edge digital projection while preserving art-deco grandeur.',
    address: 'M.G. Road, Dhobi Talao, Marine Lines',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400020',
    amenities: ['4K Digital Projection', 'Dolby Surround 7.1', 'Classic Art-Deco Lounge', 'Wheelchair Accessible']
  }
];

export const runCleanup = async () => {
  try {
    await connectDB();
    logger.info('Starting safe cleanup of test concurrency records...');

    // 1. Find matching test records
    const testMovies = await Movie.find({
      $or: [
        { title: { $regex: /concurrency/i } },
        { slug: { $regex: /concurrency/i } }
      ]
    });
    const testMovieIds = testMovies.map(m => m._id);

    const testTheatres = await Theatre.find({
      $or: [
        { name: { $regex: /concurrency/i } },
        { slug: { $regex: /concurrency/i } }
      ]
    });
    const testTheatreIds = testTheatres.map(t => t._id);

    const testScreens = await Screen.find({
      $or: [
        { theatre: { $in: testTheatreIds } },
        { name: { $regex: /concurrency/i } }
      ]
    });
    const testScreenIds = testScreens.map(s => s._id);

    const testShows = await Show.find({
      $or: [
        { movie: { $in: testMovieIds } },
        { screen: { $in: testScreenIds } }
      ]
    });
    const testShowIds = testShows.map(sh => sh._id);

    // 2. Safety check: ensure no active bookings are damaged
    const associatedBookings = await Booking.countDocuments({ show: { $in: testShowIds } });
    if (associatedBookings > 0) {
      logger.warn(`Safety alert: Found ${associatedBookings} bookings linked to test shows. Halting automatic deletion to protect customer records.`);
      await disconnectDB();
      return;
    }

    // 3. Remove test seats and shows
    if (testShowIds.length > 0) {
      const deletedSeats = await ShowSeat.deleteMany({ show: { $in: testShowIds } });
      const deletedShows = await Show.deleteMany({ _id: { $in: testShowIds } });
      logger.info(`Cleaned up ${deletedShows.deletedCount} test shows and ${deletedSeats.deletedCount} test seats.`);
    }

    // 4. Remove test screens
    if (testScreenIds.length > 0) {
      const deletedScreens = await Screen.deleteMany({ _id: { $in: testScreenIds } });
      logger.info(`Cleaned up ${deletedScreens.deletedCount} test screens.`);
    }

    // 5. Remove test theatres
    if (testTheatreIds.length > 0) {
      const deletedTheatres = await Theatre.deleteMany({ _id: { $in: testTheatreIds } });
      logger.info(`Cleaned up ${deletedTheatres.deletedCount} test theatres.`);
    }

    // 6. Remove test movies
    if (testMovieIds.length > 0) {
      const deletedMovies = await Movie.deleteMany({ _id: { $in: testMovieIds } });
      logger.info(`Cleaned up ${deletedMovies.deletedCount} test movies.`);
    }

    // 7. Upsert realistic Mumbai theatres
    logger.info('Upserting realistic Mumbai theatres...');
    for (const theatreData of realisticMumbaiTheatres) {
      await Theatre.findOneAndUpdate(
        { slug: theatreData.slug },
        { $set: theatreData },
        { upsert: true, new: true }
      );
    }
    logger.info(`Successfully ensured all ${realisticMumbaiTheatres.length} Mumbai theatres are active in database.`);

    await disconnectDB();
    logger.info('Cleanup and migration completed successfully.');
  } catch (err) {
    logger.error('Failed to execute cleanup:', err);
    throw err;
  }
};

// If run directly
if (process.argv[1]?.endsWith('cleanupTestCinema.js')) {
  runCleanup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
