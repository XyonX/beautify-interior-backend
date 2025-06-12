import express from "express";
import cors from "cors";
import pool from "../config/database.js";
import categoryRoute from "./routes/categoryRoutes.js";
import productRoute from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoute.js";
import cookieParser from "cookie-parser";
const app = express();
app.use(express.json());
app.use(cookieParser());
// Enable CORS for your frontend origin
app.use(
  cors({
    origin: "http://localhost:3000", // Allow requests from this origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
    allowedHeaders: ["Content-Type"], // Allowed headers
  })
);

// Routes
app.use("/auth", authRoutes);

app.use("/api", categoryRoute);
app.use("/api", productRoute);

const PORT = 3001 || process.env.PORT;
app.listen(3001, () => {
  console.log(`"Server started.. at http://localhost:${PORT}"`);
});
