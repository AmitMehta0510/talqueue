import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import { teammatesHandler } from "./matchmaking.controller";

const router = Router();

/** GET /api/v1/matchmaking/teammates — find complementary teammates */
router.get("/teammates", protect, teammatesHandler);

export default router;
