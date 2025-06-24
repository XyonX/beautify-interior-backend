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

router.post("/cart", authUser, addToCart);
// Get cart
router.get("/cart", authUser, getCartByUser);
// Update quantity
router.put("/cart/update", authUser, updateCartItem);
// Remove item
router.delete("/cart/remove", authUser, removeFromCart);

export default router;
