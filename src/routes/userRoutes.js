import { Router } from "express";
import authAdmin from "../middleware/authAdmin.js";
import { getAllUsers } from "../controllers/userController.js";
const route = Router();

route.get("/", authAdmin, getAllUsers);

export default route;
