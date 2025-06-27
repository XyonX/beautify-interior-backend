import express from "express";
import cors from "cors";
import categoryRoute from "./routes/categoryRoutes.js";
import productRoute from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoute.js";
import cookieParser from "cookie-parser";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import "dotenv/config";
import AWS from "aws-sdk";

const app = express();
app.use(express.json());
app.use(cookieParser());

// configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION, // e.g. 'us-east-1'
});

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://beautifyinterior.com",
      "https://www.beautifyinterior.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    exposedHeaders: ["set-cookie"], // for http cookie on prod
  })
);

// Routes
app.use("/auth", authRoutes);
app.use("/api", categoryRoute);
app.use("/api", productRoute);
app.use("/api/cart", cartRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/contact", contactRoutes);

const PORT = 3001 || process.env.PORT;
app.listen(3001, () => {
  console.log(`"Server started.. at http://localhost:${PORT}"`);
});
