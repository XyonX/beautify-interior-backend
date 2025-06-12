//categoryRoute.js
import { Router } from "express";
import {
  createCategory,
  getCategories,
} from "../controllers/categoryController.js";
import {
  uploadCategoryThumbnail,
  uploadCategoryThumbnailToR2,
} from "../middleware/imageMiddleware.js";
import authMiddleware from "../middleware/authMiddleware.js";

const route = new Router();

route.get("/categories", getCategories);
route.post(
  "/categories",
  authMiddleware,
  uploadCategoryThumbnail,
  uploadCategoryThumbnailToR2,
  createCategory
);

export default route;
