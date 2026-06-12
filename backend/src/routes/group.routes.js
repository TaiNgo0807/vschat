import express from "express";
import {
  createGroup,
  getGroupDetail,
  getGroups,
} from "../controllers/group.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getGroups);
router.post("/", protect, createGroup);
router.get("/:id", protect, getGroupDetail);

export default router;
