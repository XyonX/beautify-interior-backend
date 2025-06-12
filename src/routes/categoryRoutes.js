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

const route = new Router();

route.get("/categories", getCategories);
route.post(
  "/categories",
  uploadCategoryThumbnail,
  uploadCategoryThumbnailToR2,
  createCategory
);

export default route;
