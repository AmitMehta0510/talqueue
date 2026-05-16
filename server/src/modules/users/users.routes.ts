import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";

import {
  createEducation,
  createExperience,
  createSkill,
  getMe,
  updateMe,
} from "./users.controller";

const router = Router();

router.get("/me", protect, getMe);

router.put("/me", protect, updateMe);

router.post(
  "/me/skills",
  protect,
  createSkill
);

router.post(
  "/me/experiences",
  protect,
  createExperience
);

router.post(
  "/me/educations",
  protect,
  createEducation
);

export default router;