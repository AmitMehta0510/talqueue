import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import * as ctrl from "./externalApplications.controller";

const router = Router();

router.use(protect);

router.post("/", ctrl.createExternalApplication);
router.get("/mine", ctrl.getMyExternalApplications);
router.patch("/:id/status", ctrl.updateExternalApplicationStatus);
router.delete("/:id", ctrl.deleteExternalApplication);

export default router;
