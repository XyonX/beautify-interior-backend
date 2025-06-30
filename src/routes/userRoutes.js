import { Router } from "express";
import authAdmin from "../middleware/authAdmin.js";
import authUser from "../middleware/authUser.js";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
const route = Router();

route.get("/", authAdmin, getAllUsers);
route.get("/:id", authUser, getUserById);
route.put("/:id", authAdmin, updateUser);
route.delete("/:id", authAdmin, deleteUser);

export default route;
