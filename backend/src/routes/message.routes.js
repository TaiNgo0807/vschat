import express from "express";
import {
  createMessage,
  downloadMessageFile,
  getMediaMessages,
  getMessageSeenUsers,
  getMessages,
  markMessagesAsSeen,
  reactMessage,
  revokeMessage,
} from "../controllers/message.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.get("/", protect, getMessages);
router.get("/media", protect, getMediaMessages);

router.post("/seen", protect, markMessagesAsSeen);

router.get("/:id/seen", protect, getMessageSeenUsers);
router.post("/:id/reactions", protect, reactMessage);

router.get("/:id/download", protect, downloadMessageFile);
router.patch("/:id/revoke", protect, revokeMessage);

router.post("/", protect, upload.array("files", 10), createMessage);

export default router;
