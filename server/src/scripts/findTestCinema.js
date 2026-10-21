import { connectDB, disconnectDB } from '../config/db.js';
import { Movie } from '../models/Movie.js';
import { Theatre } from '../models/Theatre.js';
import { Screen } from '../models/Screen.js';
import { Show } from '../models/Show.js';
import { ShowSeat } from '../models/ShowSeat.js';
import { Booking } from '../models/Booking.js';

const inspect = async () => {
  try {
    await connectDB();

    console.log('--- Inspecting Database for "Test Concurrency" records ---');
    const matchingMovies = await Movie.find({
      $or: [
        { title: { $regex: /concurrency/i } },
        { slug: { $regex: /concurrency/i } }
      ]
    });
    console.log(`Matching Movies (${matchingMovies.length}):`);
    matchingMovies.forEach(m => console.log(`  - [${m._id}] ${m.title} (slug: ${m.slug})`));

    const matchingTheatres = await Theatre.find({
      $or: [
        { name: { $regex: /concurrency/i } },
        { slug: { $regex: /concurrency/i } }
      ]
    });
    console.log(`Matching Theatres (${matchingTheatres.length}):`);
    matchingTheatres.forEach(t => console.log(`  - [${t._id}] ${t.name} (city: ${t.city}, state: ${t.state})`));

    const theatreIds = matchingTheatres.map(t => t._id);
    const movieIds = matchingMovies.map(m => m._id);

    const matchingScreens = await Screen.find({
      $or: [
        { theatre: { $in: theatreIds } },
        { name: { $regex: /concurrency/i } }
      ]
    });
    console.log(`Matching Screens (${matchingScreens.length}):`);
    matchingScreens.forEach(s => console.log(`  - [${s._id}] ${s.name} (theatre: ${s.theatre})`));

    const screenIds = matchingScreens.map(s => s._id);

    const matchingShows = await Show.find({
      $or: [
        { movie: { $in: movieIds } },
        { screen: { $in: screenIds } }
      ]
    });
    console.log(`Matching Shows (${matchingShows.length}):`);
    matchingShows.forEach(sh => console.log(`  - [${sh._id}] Movie: ${sh.movie}, Screen: ${sh.screen}, Time: ${sh.startTime}`));

    const showIds = matchingShows.map(sh => sh._id);

    const matchingSeats = await ShowSeat.countDocuments({ show: { $in: showIds } });
    console.log(`Matching ShowSeats count: ${matchingSeats}`);

    const matchingBookings = await Booking.find({ show: { $in: showIds } });
    console.log(`Matching Bookings count: ${matchingBookings.length}`);

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('Inspection failed:', err);
    process.exit(1);
  }
};

inspect();
