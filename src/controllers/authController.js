// controllers/auth.js
import pool from "../../config/database.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import * as crypto from "crypto";
import jwt from "jsonwebtoken";

import { sendVerificationEmail } from "../utils/emailService.js";

dotenv.config();

export const verifyEmail = async (req, res) => {
  const { token } = req.query;
  console.log(`[Email Verification] Starting verification for token: ${token}`); // Log token received

  try {
    // Log database query attempt
    console.log(`[Email Verification] Querying DB for token: ${token}`);

    const userResult = await pool.query(
      `SELECT * FROM users 
       WHERE email_verification_token = $1 `,
      [token]
    );

    // Handle invalid/expired tokens
    if (userResult.rows.length === 0) {
      console.warn(`[Email Verification] Invalid token: ${token}`);
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/verify?status=invalid`
      );
    }
    if (new Date() > new Date(userResult.rows[0].email_verification_expires)) {
      console.warn(`[Email Verification] expired token: ${token}`);
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/verify?status=expired`
      );
    }

    const user = userResult.rows[0];
    console.log(`[Email Verification] Found user: ${user.id} (${user.email})`);

    // Update verification status
    console.log(`[Email Verification] Updating verification for: ${user.id}`);
    await pool.query(
      `UPDATE users 
       SET is_email_verified = TRUE,
           email_verification_token = NULL,
           email_verification_expires = NULL
       WHERE id = $1`,
      [user.id]
    );

    console.log(`[Email Verification] Success for user: ${user.id}`);
    res.redirect(`${process.env.FRONTEND_URL}/auth/verify?status=success`);
  } catch (error) {
    console.error(`[Email Verification] ERROR for token ${token}:`, error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

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
    await sendVerificationEmail(email, firstName, verificationToken);

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
    console.log("Login attempt initiated");

    // Validate body
    if (!req.body || typeof req.body !== "object") {
      console.log("Invalid request body - missing or incorrect format");
      return res
        .status(400)
        .json({ error: "Request body is missing or invalid." });
    }

    const { email, password } = req.body;
    console.log(`Login attempt for email: ${email}`);

    if (!email || !password) {
      console.log("Validation failed - email or password missing");
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    // Check if user exists
    console.log(`Checking database for user with email: ${email}`);
    const userQuery = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (userQuery.rows.length === 0) {
      console.log(`No user found with email: ${email}`);
      return res.status(404).json({
        error: "Account does not exist. Please register.",
      });
    }

    const user = userQuery.rows[0];
    console.log(`User found: ${user.email} (ID: ${user.id})`);

    // Compare password
    console.log("Comparing provided password with stored hash");
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log("Password comparison failed - invalid credentials");
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // NEW: Fetch user addresses
    console.log(`Fetching addresses for user ID: ${user.id}`);
    const addressQuery = await pool.query(
      `SELECT 
        id,
        type,
        first_name AS "firstName",
        last_name AS "lastName",
        company,
        address,
        address2,
        city,
        state,
        zip_code AS "zipCode",
        country,
        phone,
        is_default AS "isDefault"
       FROM addresses 
       WHERE user_id = $1`,
      [user.id]
    );

    const addresses = addressQuery.rows;
    console.log(`Found ${addresses.length} addresses for user`);

    // Create JWT token
    console.log("Password matched - generating JWT token");
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

    const isProduction = process.env.NODE_ENV === "production";
    console.log(`Environment is production: ${isProduction}`);

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
      maxAge: parseInt(process.env.USER_SESSION_EXPIRY),
    };

    // Domain configuration
    cookieOptions.domain = isProduction ? ".beautifyinterior.com" : "localhost";
    console.log("Cookie options set:", cookieOptions);

    res.cookie("authToken", token, cookieOptions);
    console.log("Auth token cookie set successfully");

    const userDetails = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      // NEW: Add addresses to user object
      addresses: addresses.map((addr) => ({
        id: addr.id,
        type: addr.type,
        firstName: addr.firstName,
        lastName: addr.lastName,
        company: addr.company,
        address: addr.address,
        address2: addr.address2,
        city: addr.city,
        state: addr.state,
        zipCode: addr.zipCode,
        country: addr.country,
        phone: addr.phone,
        isDefault: addr.isDefault,
      })),
    };

    console.log(`Login successful for user: ${user.email} (ID: ${user.id})`);
    return res.status(200).json({
      message: "Login successful.",
      user: userDetails,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      error: "Internal server error.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const logoutUser = async (req, res) => {
  res.clearCookie("authToken");
  res.json({ message: "Logout successful" });
};

export const resetPassword = async (req, res) => {};
