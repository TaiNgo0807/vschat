import express from "express";
import {
  createMessage,
  downloadMessageFile,
  getMessages,
  markMessagesAsSeen,
  revokeMessage,
} from "../controllers/message.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.get("/", protect, getMessages);
router.post("/seen", protect, markMessagesAsSeen);
router.get("/:id/download", protect, downloadMessageFile);
router.patch("/:id/revoke", protect, revokeMessage);
router.post("/", protect, upload.single("file"), createMessage);

export default router;
