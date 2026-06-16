import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import * as ctrl from "./placementDrives.controller";

const router = Router();

// Public read — students don't need auth to browse drives
router.get("/college/:collegeId", ctrl.getDrivesForCollege);

// Auth required for writes and personal views
router.use(protect);
router.post("/", ctrl.createPlacementDrive);
router.get("/mine", ctrl.getMyPostedDrives);
router.patch("/:id", ctrl.updatePlacementDrive);
router.patch("/:id/close", ctrl.closePlacementDrive);

export default router;
