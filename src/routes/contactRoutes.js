import { Router } from "express";
import { submitContactForm } from "../controllers/contactController.js";

const route = Router();

route.post("/", submitContactForm);

export default route;
