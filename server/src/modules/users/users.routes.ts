import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";

import {
  createEducation,
  createExperience,
  createSkill,
  getMe,
  getMeEducations,
  getMeExperiences,
  getMeFull,
  getMeSkills,
  getUserFull,
  searchSkillsHandler,
  updateMe,
} from "./users.controller";

const router = Router();

router.get("/me", protect, getMe);

router.get("/me/full", protect, getMeFull);

router.get("/me/skills", protect, getMeSkills);

router.get("/me/experiences", protect, getMeExperiences);

router.get("/me/educations", protect, getMeEducations);

router.get("/skills/search", protect, searchSkillsHandler);

router.put("/me", protect, updateMe);

router.post("/me/skills", protect, createSkill);

router.post("/me/experiences", protect, createExperience);

router.post("/me/educations", protect, createEducation);

router.get("/:userId", protect, getUserFull);

export default router;
