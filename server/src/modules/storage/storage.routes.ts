import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import { getPresignedUrlHandler } from "./storage.controller";

const router = Router();

// POST /api/v1/storage/presigned-url
router.post("/presigned-url", protect, getPresignedUrlHandler);

export default router;
