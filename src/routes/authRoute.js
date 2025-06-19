//authRoute.js
import Router from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import authAdmin from "../middleware/authAdmin.js";

import {
  verifyEmail,
  registerUser,
  loginUser,
  logoutUser,
} from "../controllers/authController.js";
import authUser from "../middleware/authUser.js";
dotenv.config();

const router = Router();

router.get("/check-auth", authUser, (req, res) => {
  // If authMiddleware passes, we know the user is authenticated

  if (!req.user) {
    return res.status(400).json({ error: "User not found" });
  }
  const user = req.user;
  if (user.role == "admin") {
    return res.json({
      isAuthenticated: true,
      user: req.user,
      message: "Logged in as admin",
    });
  } else if (user.role == "super_admin") {
    return res.json({
      isAuthenticated: true,
      user: req.user,
      message: "Logged in as super-admin",
    });
  }
  res.json({
    isAuthenticated: true,
    user: user,
    message: "Logged in as User",
  });
});

// GET /api/auth/verify-email
router.get("/verify-email", verifyEmail);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);

export default router;
