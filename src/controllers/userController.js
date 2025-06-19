import pool from "../../config/database.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import * as crypto from "crypto";
import jwt from "jsonwebtoken";

import sendVerificationEmail from "../utils/email.js";

dotenv.config();

export const registerUser = async (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    return res
      .status(400)
      .json({ error: "Request body is missing or invalid." });
  }
  const { email, password, firstName, lastName, role, status } = req.body; // Fix: req.body not res.body

  try {
    // Check if email exists
    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({
        error: "Email already in use",
      });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Insert into database - FIXED table name to "users"
    const query = `
        INSERT INTO users 
          (email, password, first_name, last_name, 
           email_verification_token, email_verification_expires,role,status)
        VALUES ($1, $2, $3, $4, $5, $6,$7,$8)
        RETURNING id
      `;

    const newUser = await pool.query(query, [
      email,
      hashedPassword, // Use hashed password
      firstName,
      lastName,
      verificationToken,
      verificationExpires,
      role,
      status,
    ]);

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      message: "User registered. Please check your email for verification.",
      userId: newUser.rows[0].id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    // Validate body
    if (!req.body || typeof req.body !== "object") {
      return res
        .status(400)
        .json({ error: "Request body is missing or invalid." });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    // Check if user exists
    const userQuery = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        error: "Account does not exist. Please register.",
      });
    }

    const user = userQuery.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // // Create JWT token
    // const token = jwt.sign(
    //   { email: user.email, id: user.id },
    //   process.env.JWT_SECRET,
    //   {
    //     expiresIn: "1d",
    //   }
    // );
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        status: user.status,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // // Set HTTP-only cookie
    // res.cookie("authToken", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production", // HTTPS in production
    //   // sameSite: "strict",
    //   sameSite: "none", // Allow cross-site requests
    //   maxAge: parseInt(process.env.USER_SESSION_EXPIRY),
    // });

    const isProduction = process.env.NODE_ENV === "production";
    console.log("is production :", isProduction);
    // Cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // false in dev
      sameSite: isProduction ? "None" : "Lax", // Lax in dev
      maxAge: parseInt(process.env.USER_SESSION_EXPIRY),
    };
    console.log("cookie options ", cookieOptions);

    // Set domain to "localhost" in development only
    if (!isProduction) {
      cookieOptions.domain = "localhost";
    }

    res.cookie("authToken", token, cookieOptions);
    console.log("Attached cookie with login res: ", res.cookie);

    const userDetails = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
    };

    return res.status(200).json({
      message: "Login successful.",
      user: userDetails,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
