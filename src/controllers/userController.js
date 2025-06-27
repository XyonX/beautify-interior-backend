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
