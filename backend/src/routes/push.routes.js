import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getPublicVapidKey,
  subscribePush,
  unsubscribePush,
} from "../controllers/push.controller.js";

const router = express.Router();

router.get("/public-key", protect, getPublicVapidKey);
router.post("/subscribe", protect, subscribePush);
router.post("/unsubscribe", protect, unsubscribePush);

export default router;
