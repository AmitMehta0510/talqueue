import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";

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

const router = Router();

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
  getHackathonsHandler
);

router.get(
  "/:id",
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