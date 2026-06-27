import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import { getPresignedUrlHandler, validateFileHandler } from "./storage.controller";

const router = Router();

// POST /api/v1/storage/validate
// Pre-upload file signature check — must be called before requesting a presigned URL.
router.post("/validate", protect, validateFileHandler);

// POST /api/v1/storage/presigned-url
router.post("/presigned-url", protect, getPresignedUrlHandler);

export default router;
