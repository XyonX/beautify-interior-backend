import pool from "../../config/database.js";

export const submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "All fields are required." });
    }

    await pool.query(
      `INSERT INTO contact_forms (name,email,subject,message) VALUES ($1,$2,$3,$4)`,
      [name, email, subject, message]
    );

    res.status(201).json({ message: " Contact form submitted" });
  } catch (error) {
    console.error("Error saving contact form ,", error);
    res.status(500).json({ message: "Internam server error" });
  }
};
