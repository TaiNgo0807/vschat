import express from "express";
import { getUsers, uploadAvatar } from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.get("/", protect, getUsers);
router.patch("/avatar", protect, upload.single("avatar"), uploadAvatar);

export default router;
