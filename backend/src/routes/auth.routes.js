import express from "express";
import { getMe, login, register } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

if (process.env.ALLOW_PUBLIC_REGISTER === "true") {
  router.post("/register", register);
}

router.post("/login", login);
router.get("/me", protect, getMe);

export default router;
