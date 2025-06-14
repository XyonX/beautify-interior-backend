// controllers/auth.js
export const verifyEmail = async (req, res) => {
    const { token } = req.query;
  
    try {
      // Find user by token
      const userResult = await pool.query(
        `SELECT * FROM users 
         WHERE email_verification_token = $1 
         AND email_verification_expires > NOW()`,
        [token]
      );
  
      if (userResult.rows.length === 0) {
        return res.status(400).json({
          error: "Invalid or expired verification token",
        });
      }
  
      const user = userResult.rows[0];
  
      // Update verification status
      await pool.query(
        `UPDATE users 
         SET is_email_verified = TRUE,
             email_verification_token = NULL,
             email_verification_expires = NULL
         WHERE id = $1`,
        [user.id]
      );
  
      res.status(200).json({
        message: "Email verified successfully!",
      });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  };