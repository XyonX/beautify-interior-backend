import { Router } from "express";
import pool from "../../config/database.js";
import authUser from "../middleware/authUser.js";
import {
  addToCart,
  getCartByUser,
  updateCartItem,
  removeFromCart,
} from "../controllers/cartController.js";

const router = Router();

router.post("/", authUser, addToCart);
// Get cart
router.get("/", authUser, getCartByUser);
// Update quantity
router.put("/update/:id", authUser, updateCartItem);
// Remove item
router.delete("/remove/:id", authUser, removeFromCart);

export default router;
