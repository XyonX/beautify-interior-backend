import pool from "../../config/database.js";

export const subscribeToNewsletter = async (req, res) => {
  const { email, source } = req.body;
  if (!email || !source) {
    return res
      .status(400)
      .json({ success: false, message: "Email and source are required" });
  }

  try {
    await pool.query(
      `INSERT INTO newsletters (email,source) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING`,
      [email, source]
    );

    return res
      .status(200)
      .json({ success: true, message: "Subscribe Successfully!" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong ." });
  }
};

export const unsubscribeFromNewsletter = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required to unsubscribe. ",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE newsletters SET is_active = FALSE, unsubscribed_at = CURRENT_TIMESTAMP WHERE email =$1 AND is_active=TRUE`,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Email not fount or alreay unsubscribe ",
      });
    }
    return res
      .status(200)
      .json({ success: true, message: "Unsubscribe successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Server error during unsubscribe" });
  }
};
