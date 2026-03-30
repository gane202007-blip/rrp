/**
 * Database Connection Helper
 * ==========================
 * Connects to MongoDB using Mongoose.
 * Connection string comes from .env file (MONGO_URI).
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // Exit if DB connection fails
  }
};

module.exports = connectDB;
