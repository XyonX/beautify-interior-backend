import express from "express";
import cors from "cors";
import pool from "../config/database.js";
import categoryRoute from "./routes/categoryRoutes.js";
import productRoute from "./routes/productRoutes.js";

const app = express();
app.use(express.json());

// Enable CORS for your frontend origin
app.use(
  cors({
    origin: "http://localhost:3000", // Allow requests from this origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
    allowedHeaders: ["Content-Type"], // Allowed headers
  })
);

app.use("/api", categoryRoute);
app.use("/api", productRoute);

app.get("/", async (req, res, next) => {
  try {
    // 1. Get table names
    const tablesResult = await pool.query(`
      SELECT table_name
        FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_type   = 'BASE TABLE'
       ORDER BY table_name;
    `);
    const tableNames = tablesResult.rows.map((r) => r.table_name);

    // 2. Send back both count and names
    res.json({
      table_count: tableNames.length,
      tables: tableNames,
    });
  } catch (err) {
    next(err);
  }
});

const PORT = 3001 || process.env.PORT;
app.listen(3001, () => {
  console.log(`"Server started.. at http://localhost:${PORT}"`);
});
