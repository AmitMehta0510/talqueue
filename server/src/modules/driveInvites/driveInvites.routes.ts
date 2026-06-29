import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import * as ctrl from "./driveInvites.controller";

const router = Router();

router.use(protect);

router.post("/", ctrl.sendInvite);
router.get("/college/:collegeId", ctrl.listInvitesForCollege);
router.get("/college/:collegeId/sent", ctrl.listSentInvitesByCollege);
router.get("/company/:companyId", ctrl.listInvitesSentByCompany);
router.get("/company/:companyId/received", ctrl.listInvitesReceivedByCompany);
router.patch("/:inviteId/respond", ctrl.respondToInvite);
router.patch("/:inviteId/withdraw", ctrl.withdrawInvite);

export default router;
