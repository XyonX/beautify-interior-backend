//prodcutRoutes.js
import { Router } from "express";
import {
  uploadProductImages,
  uploadProductImagesToR2,
} from "../middleware/imageMiddleware.js";
import {
  createProduct,
  getProducts,
  getProductById,
} from "../controllers/productController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const route = Router();

route.post(
  "/products",
  authMiddleware,
  uploadProductImages,
  uploadProductImagesToR2,
  createProduct
);

route.get("/products", getProducts);
route.get("/products/:id", getProductById);

export default route;
