import { Router }
from "express";

import {

  getTopEngineersHandler,

  getTopProjectsHandler,

  getTopHackathonEngineersHandler,

  getTopTeamsHandler,

  getFastestGrowingEngineersHandler,

} from "./leaderboard.controller";

const router =
  Router();

router.get(
  "/engineers",
  getTopEngineersHandler
);

router.get(
  "/projects",
  getTopProjectsHandler
);

router.get(
  "/hackathon-engineers",
  getTopHackathonEngineersHandler
);

router.get(
  "/teams",
  getTopTeamsHandler
);

router.get(
  "/fastest-growing",
  getFastestGrowingEngineersHandler
);

export default router;