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
import authAdmin from "../middleware/authAdmin.js";

const route = new Router();

route.get("/categories", getCategories);
route.post(
  "/categories",
  authAdmin,
  uploadCategoryThumbnail,
  uploadCategoryThumbnailToR2,
  createCategory
);

export default route;
