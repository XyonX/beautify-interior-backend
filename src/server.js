import express from "express";
import cors from "cors";
import pool from "../config/database.js";
import categoryRoute from "./routes/categoryRoutes.js";
import productRoute from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoute.js";
import cookieParser from "cookie-parser";
import userRoute from "./routes/userRoutes.js";

const app = express();
app.use(express.json());
app.use(cookieParser());
// Enable CORS for your frontend origin
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://beautifyinterior.com",
      "https://www.beautifyinterior.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Routes
app.use("/auth", authRoutes);

app.use("/api", categoryRoute);
app.use("/api", productRoute);
app.use("/api/users", userRoute);

const PORT = 3001 || process.env.PORT;
app.listen(3001, () => {
  console.log(`"Server started.. at http://localhost:${PORT}"`);
});
