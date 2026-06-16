import { Router } from "express";

import { protect, optionalProtect } from "modules/auth/auth.middleware";

import {
  createHackathonHandler,
  getHackathonsHandler,
  getHackathonHandler,
  registerTeamHandler,
  submitProjectHandler,
  reviewRegistrationHandler,
  archiveHackathonHandler,
  deleteHackathonHandler,
  assignJudgeHandler,
  evaluateSubmissionHandler,
  declareHackathonWinnersHandler,
  getHackathonLeaderboardHandler,
} from "./hackathons.controller";
import prisma from "shared/database/prisma";

const router = Router();

router.param("id", async (req: any, res, next, id) => {
  if (id) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      const hackathon = await prisma.hackathon.findUnique({
        where: { slug: id },
        select: { id: true },
      });
      if (hackathon) {
        req.params.id = hackathon.id;
      }
    }
  }
  next();
});

router.param("hackathonId", async (req: any, res, next, hackathonId) => {
  if (hackathonId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hackathonId);
    if (!isUuid) {
      const hackathon = await prisma.hackathon.findUnique({
        where: { slug: hackathonId },
        select: { id: true },
      });
      if (hackathon) {
        req.params.hackathonId = hackathon.id;
      }
    }
  }
  next();
});

router.post(
  "/",
  protect,
  createHackathonHandler
);

router.post(
  "/:hackathonId/judges",
  protect,
  assignJudgeHandler
);

router.get(
  "/",
  optionalProtect,
  getHackathonsHandler
);

router.get(
  "/:id",
  optionalProtect,
  getHackathonHandler
);

router.post(
  "/:id/register",
  protect,
  registerTeamHandler
);

router.patch(
  "/registrations/:registrationId/review",
  protect,
  reviewRegistrationHandler
);

router.post(
  "/:id/submit",
  protect,
  submitProjectHandler
);

router.post(
  "/submissions/:submissionId/evaluate",
  protect,
  evaluateSubmissionHandler
);

router.post(
  "/:hackathonId/declare-winners",
  protect,
  declareHackathonWinnersHandler
);

router.get(
  "/:hackathonId/leaderboard",
  getHackathonLeaderboardHandler
);



router.patch(
  "/:hackathonId/archive",
  protect,
  archiveHackathonHandler
);

router.delete(
  "/:hackathonId",
  protect,
  deleteHackathonHandler
);



export default router;