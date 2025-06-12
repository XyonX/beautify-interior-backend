// src/db.js
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

// For Neon you need SSL but allow self‐signed certificates:
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;
