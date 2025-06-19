import { Router } from "express";
import Stripe from "stripe";
import pool from "../../config/database.js";
import authMiddleware from "../middleware/authMiddleware.js";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = Router();

router.post("/payments/initiate", authMiddleware, async (req, res) => {
  // const { order_id } = req.body;
  // const order = await pool.query(`SELECT * FROM orders WHERE id = $1`, [
  //   order_id,
  // ]);
  // if (!order.rows[0]) return res.status(404).json({ error: "Order not found" });
  // const paymentIntent = await stripe.paymentIntents.create({
  //   amount: order.rows[0].total * 100, // Cents
  //   currency: "usd",
  //   metadata: { order_id: order_id },
  // });
  // res.json({ clientSecret: paymentIntent.client_secret });
});

router.post("/payments/confirm", async (req, res) => {
  // const { payment_intent_id } = req.body;
  // const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
  // if (paymentIntent.status === "succeeded") {
  //   const order_id = paymentIntent.metadata.order_id;
  //   await pool.query(
  //     `UPDATE orders SET payment_status = 'paid' WHERE id = $1`,
  //     [order_id]
  //   );
  //   await pool.query(
  //     `INSERT INTO transactions (order_id, type, status, amount, gateway, gateway_transaction_id)
  //      VALUES ($1, 'payment', 'success', $2, 'stripe', $3)`,
  //     [order_id, paymentIntent.amount / 100, paymentIntent.id]
  //   );
  //   res.json({ message: "Payment successful" });
  // } else {
  //   res.status(400).json({ error: "Payment failed" });
  // }
});

export default router;
