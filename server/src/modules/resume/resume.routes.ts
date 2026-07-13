import { Router, Response } from "express";
import { protect } from "modules/auth/auth.middleware";
import { buildResumePdf } from "controllers/resumeController";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";
import { generateResumeReview, getResumeReviews } from "./resume-ai.service";

const router = Router();

// POST /api/v1/resume/generate
// Generates and downloads the authenticated user's own resume as a PDF.
router.post(
  "/generate",
  protect,
  asyncHandler(async (req: any, res: Response) => {
    const { buffer, username } = await buildResumePdf(req.user.id);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="resume_${username}.pdf"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }),
);

// GET /api/v1/resume/users/:userId
// Downloads the resume PDF for a given user (e.g. recruiter viewing a candidate).
router.get(
  "/users/:userId",
  protect,
  asyncHandler(async (req: any, res: Response) => {
    const { buffer, username } = await buildResumePdf(req.params.userId);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="resume_${username}.pdf"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }),
);

// POST /api/v1/resume/review
// Generates an AI review of the authenticated user's profile and resume.
router.post(
  "/review",
  protect,
  asyncHandler(async (req: any, res: Response) => {
    const review = await generateResumeReview(req.user.id);
    res.json(successResponse(review, "AI profile review generated successfully"));
  }),
);

// GET /api/v1/resume/reviews
// Retrieves the authenticated user's historical AI reviews.
router.get(
  "/reviews",
  protect,
  asyncHandler(async (req: any, res: Response) => {
    const reviews = await getResumeReviews(req.user.id);
    res.json(successResponse(reviews));
  }),
);

export default router;

