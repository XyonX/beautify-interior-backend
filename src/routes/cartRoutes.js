import { Router } from "express";
import pool from "../../config/database.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

// Get cart
router.get("/cart", authMiddleware, async (req, res) => {
  const user_id = req.user ? req.user.id : null;
  const session_id = req.cookies.sessionId;

  try {
    const result = await pool.query(
      `SELECT ci.*, p.name, p.price
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.user_id = $1 OR ci.session_id = $2`,
      [user_id, session_id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update quantity
router.put("/cart/update", authMiddleware, async (req, res) => {
  const { cart_item_id, quantity } = req.body;
  try {
    const result = await pool.query(
      `UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *`,
      [quantity, cart_item_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove item
router.delete("/cart/remove", authMiddleware, async (req, res) => {
  const { cart_item_id } = req.body;
  try {
    await pool.query(`DELETE FROM cart_items WHERE id = $1`, [cart_item_id]);
    res.json({ message: "Item removed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
