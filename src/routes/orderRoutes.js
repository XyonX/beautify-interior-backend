import { Router } from "express";
import pool from "../../config/database.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

router.post("/orders", authMiddleware, async (req, res) => {
  const user_id = req.user.id;
  const { shipping_address, billing_address } = req.body;

  try {
    // Get cart items
    const cart = await pool.query(
      `SELECT ci.*, p.price FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [user_id]
    );

    if (!cart.rows.length)
      return res.status(400).json({ error: "Cart is empty" });

    // Calculate totals
    const subtotal = cart.rows.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const shipping_amount = 10.0; // Example
    const tax_amount = subtotal * 0.1; // 10% tax
    const total = subtotal + shipping_amount + tax_amount;

    // Create order
    const order = await pool.query(
      `INSERT INTO orders (order_number, user_id, email, status, payment_status, fulfillment_status,
       subtotal, tax_amount, shipping_amount, discount_amount, total, currency, shipping_address)
       VALUES ($1, $2, $3, 'pending', 'pending', 'unfulfilled', $4, $5, $6, 0, $7, 'USD', $8)
       RETURNING *`,
      [
        `ORD${Date.now()}`,
        user_id,
        req.user.email,
        subtotal,
        tax_amount,
        shipping_amount,
        total,
        shipping_address,
      ]
    );

    // Move cart items to order_items
    for (const item of cart.rows) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          order.rows[0].id,
          item.product_id,
          item.variant_id,
          item.quantity,
          item.price,
          item.price * item.quantity,
        ]
      );
      await pool.query(
        `UPDATE products SET quantity = quantity - $1 WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // Clear cart
    await pool.query(`DELETE FROM cart_items WHERE user_id = $1`, [user_id]);

    res.json(order.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
