import { Router } from "express";
import {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
} from "../controllers/newsletterController.js";

const route = Router();

route.post("/subscribe", subscribeToNewsletter);
route.post("/unsubscribe", unsubscribeFromNewsletter);

export default route;
