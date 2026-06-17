import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import * as ctrl from "./placementDrives.controller";

const router = Router();

// Public read — students don't need auth to browse drives
router.get("/college/:collegeId", ctrl.getDrivesForCollege);

// Auth required for all other routes
router.use(protect);

// Admin view — all drives for a college (including CLOSED), auth-gated
router.get("/college/:collegeId/admin", ctrl.getAllDrivesForCollege);

// Drive management
router.post("/", ctrl.createPlacementDrive);
router.get("/mine", ctrl.getMyPostedDrives);
router.patch("/:id", ctrl.updatePlacementDrive);
router.patch("/:id/close", ctrl.closePlacementDrive);

// Eligibility pre-check — student can check if they qualify before applying
router.get("/:id/eligibility", ctrl.checkEligibility);

// Student applications
router.post("/:id/apply", ctrl.applyToDrive);
router.get("/applications/mine", ctrl.getMyDriveApplications);
router.get("/:id/applicants", ctrl.getDriveApplicants);
router.patch("/applications/:applicationId", ctrl.updateApplicationStatus);

export default router;
