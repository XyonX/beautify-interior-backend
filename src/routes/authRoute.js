import Router from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import authMiddleware from "../middleware/authMiddleware.js";
import { verifyEmail } from "../controllers/authController.js";
dotenv.config();

const router = Router();

router.get("/check-auth", authMiddleware, (req, res) => {
  // If authMiddleware passes, we know the user is authenticated
  const mockAdminUser = {
    id: "admin",
    email: "admin@beautifyinterior.com",
    firstName: "Joydip",
    lastName: "chakraborty",
    role: "admin",
    permissions: [
      "products.read",
      "products.write",
      "orders.read",
      "orders.write",
      "customers.read",
      "customers.write",
    ],
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-05-01T00:00:00Z",
    lastLogin: new Date().toISOString(),
  };

  res.json({ isAuthenticated: true, user: mockAdminUser });
});

// GET /api/auth/verify-email
router.get("/verify-email", verifyEmail);

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).send({
      error: "Username and password required",
    });
  }
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign(
      { username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.SESSION_EXPIRY / 1000 } // Convert to seconds
    );

    // Set HTTP-only cookie
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS in production
      // sameSite: "strict",
      sameSite: "none", // Allow cross-site requests
      maxAge: parseInt(process.env.SESSION_EXPIRY),
    });

    const mockAdminUser = {
      id: "admin",
      email: "admin@beautifyinterior.com",
      firstName: "Joydip",
      lastName: "chakraborty",
      role: "admin",
      permissions: [
        "products.read",
        "products.write",
        "orders.read",
        "orders.write",
        "customers.read",
        "customers.write",
      ],
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-05-01T00:00:00Z",
      lastLogin: new Date().toISOString(),
    };

    return res.json({ message: "Login successful", user: mockAdminUser });
  }

  res.status(401).json({ error: "Invalid credentials" });
});

router.post("/logout", (req, res) => {
  res.clearCookie("authToken");
  res.json({ message: "Logout successful" });
});

export default router;
