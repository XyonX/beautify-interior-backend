import pool from "../../config/database.js";

export const getAllUsers = async (req, res) => {
  try {
    const query = `
      SELECT 
        id, 
        email, 
        first_name, 
        last_name, 
        phone, 
        date_of_birth, 
        avatar, 
        is_email_verified, 
        role, 
        status, 
        marketing_opt_in, 
        last_login_at, 
        created_at, 
        updated_at 
      FROM users
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserById = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "No user id is provided" });
  }

  try {
    const dbResponse = await pool.query(
      `SELECT id,email,first_name,last_name,phone,date_of_birth,avatar,is_email_verified,role,status FROM users where id=$1 `,
      [id]
    );

    if (dbResponse.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json(dbResponse.rows[0]);
  } catch (error) {
    // Handle invalid UUID error (PostgreSQL error code 22P02)
    if (error.code === "22P02") {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const {
    email,
    firstName, // camelCase
    lastName, // camelCase
    phone,
    dateOfBirth,
    role,
    status,
    marketingOptIn, // camelCase (consistent with destructuring)
  } = req.body;

  // Validate required fields
  if (!email || !firstName || !lastName || !role || !status) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Validate UUID format if using UUIDs
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return res.status(400).json({ error: "Invalid user ID format" });
  }

  try {
    const query = `
      UPDATE users SET 
        email = $1,
        first_name = $2,
        last_name = $3,
        phone = $4,
        date_of_birth = $5,
        role = $6,
        status = $7,
        marketing_opt_in = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `;

    // Correct parameter order
    const result = await pool.query(query, [
      email,
      firstName, // maps to first_name
      lastName, // maps to last_name
      phone,
      dateOfBirth,
      role,
      status,
      marketingOptIn, // maps to marketing_opt_in
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    // Handle invalid UUID error
    if (error.code === "22P02") {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    console.error("Error updating user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "No user ID provided" });
  }

  // Validate UUID format if using UUIDs
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return res.status(400).json({ error: "Invalid user ID format" });
  }

  try {
    const dbResponse = await pool.query(
      `DELETE FROM users WHERE id = $1 RETURNING *`,
      [id]
    );

    if (dbResponse.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    // Handle specific PostgreSQL error for invalid UUID
    if (error.code === "22P02") {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
