import express from "express";
import cors from "cors";
import pool from "../config/database.js";
import categoryRoute from "./routes/categoryRoutes.js";
import productRoute from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoute.js";
import cookieParser from "cookie-parser";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import shipmentRoutes from "./routes/shipmentRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";

const app = express();
app.use(express.json());
app.use(cookieParser());
// Enable CORS for your frontend origin
// app.use(
//   cors({
//     origin: [
//       "http://localhost:3000",
//       "https://beautifyinterior.com",
//       "https://www.beautifyinterior.com",
//     ],
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true,
//   })
// );

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
    exposedHeaders: ["set-cookie"], // for http cookie on prod
  })
);

// Routes
app.use("/auth", authRoutes);

app.use("/api", categoryRoute);
app.use("/api", productRoute);

// app.use("/api", cartRoutes);
// app.use("/api", orderRoutes);
// app.use("/api", paymentRoutes);
// app.use("/api", shipmentRoutes);
app.use("/api/addresses", addressRoutes);

const PORT = 3001 || process.env.PORT;
app.listen(3001, () => {
  console.log(`"Server started.. at http://localhost:${PORT}"`);
});
