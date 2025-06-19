import { Router } from "express";
import pool from "../../config/database.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

router.post("/shipments", authMiddleware, async (req, res) => {
  const { order_id, tracking_number, carrier } = req.body;

  try {
    const shipment = await pool.query(
      `INSERT INTO shipments (order_id, tracking_number, carrier, status)
       VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [order_id, tracking_number, carrier]
    );

    await pool.query(
      `UPDATE orders SET fulfillment_status = 'fulfilled' WHERE id = $1`,
      [order_id]
    );
    res.json(shipment.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
