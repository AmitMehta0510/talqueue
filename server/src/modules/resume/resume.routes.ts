import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import { generateResumePdf } from "controllers/resumeController";

const router = Router();

// POST /api/v1/resume/generate
router.post("/generate", protect, generateResumePdf);

// GET /api/v1/resume/users/:userId
router.get("/users/:userId", protect, generateResumePdf);

export default router;
