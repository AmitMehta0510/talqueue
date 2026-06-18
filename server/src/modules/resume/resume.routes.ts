import { Router } from "express";
import { generateResumePdf } from "./resume.controller";

const router = Router();

// POST /api/v1/resume/generate
router.post("/generate", generateResumePdf);

// GET /api/v1/resume/users/:userId
router.get("/users/:userId", generateResumePdf);

export default router;
