import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
  try {
    console.log('Testing Atlas connection with 5s timeout...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('Connected to Atlas successfully!');
    const count = await mongoose.connection.db.collection('theatres').countDocuments();
    console.log('Total theatres in DB:', count);
    const theatres = await mongoose.connection.db.collection('theatres').find({}).toArray();
    theatres.forEach(t => console.log(' -', t.name, '|', t.city, '|', t.state));
    await mongoose.disconnect();
  } catch (err) {
    console.error('Atlas connection error:', err.message);
  }
};

test();
