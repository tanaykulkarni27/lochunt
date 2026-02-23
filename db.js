require("dotenv").config();

const mongoose = require("mongoose");

const DB_NAME = process.env.MONGODB_DB || "tracker";
const MONGODB_URI = process.env.MONGODB_URI || '';

let cached = global._mongoose;

if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
