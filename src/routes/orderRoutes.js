import { Router } from "express";
import pool from "../../config/database.js";
import authUser from "../middleware/authUser.js";
import {
  createOrder,
  createPendingOrder,
  getOrderById,
  getOrdersByUser,
  verifyPayment,
} from "../controllers/orderController.js";

const router = Router();

router.post("/", authUser, createOrder);
router.get("/:id", authUser, getOrderById);
router.get("/user/:userId", authUser, getOrdersByUser);
router.post("/create-pending", authUser, createPendingOrder);
router.post("/verify-payment", authUser, verifyPayment);

export default router;
