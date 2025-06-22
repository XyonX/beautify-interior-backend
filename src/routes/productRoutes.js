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
  getSimilarProducts,
  updateProduct,
} from "../controllers/productController.js";
import authAdmin from "../middleware/authAdmin.js";

const route = Router();

route.post(
  "/products",
  authAdmin,
  uploadProductImages,
  uploadProductImagesToR2,
  createProduct
);

route.get("/products", getProducts);
route.get("/products/:id", getProductById);
route.patch("/products/:id", updateProduct);

// New route for similar products
route.get("/products/:id/similar", getSimilarProducts);

export default route;
