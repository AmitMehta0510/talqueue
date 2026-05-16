import { Router }
from "express";

import {getEngineeringPortfolioHandler,} from "./engineering-portfolio.controller";

const router = Router();

router.get(
  "/portfolio/:username",
  getEngineeringPortfolioHandler
);

export default router;