import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";

import {
  createEducation,
  createExperience,
  createSkill,
  createCustomSkillHandler,
  deleteEducation,
  deleteExperience,
  deleteSkill,
  getMe,
  getMeEducations,
  getMeExperiences,
  getMeFull,
  getMeSkills,
  getMyProjectsHandler,
  getUserFull,
  searchSkillsHandler,
  updateEducationHandler,
  updateExperienceHandler,
  updateMe,
  verifyMySkills,
  upgradeToPremiumRecruiter,
  verifyCollegeEmailHandler,
  verifyWorkEmailHandler,
} from "./users.controller";

const router = Router();

router.get("/me", protect, getMe);

router.get("/me/full", protect, getMeFull);

router.get("/me/skills", protect, getMeSkills);

router.get("/me/experiences", protect, getMeExperiences);

router.get("/me/educations", protect, getMeEducations);

router.get("/me/projects", protect, getMyProjectsHandler);

router.get("/skills/search", protect, searchSkillsHandler);

router.post("/skills/create-custom", protect, createCustomSkillHandler);

router.put("/me", protect, updateMe);

router.post("/me/skills", protect, createSkill);
router.post("/me/skills/verify", protect, verifyMySkills);
router.post("/me/upgrade-premium", protect, upgradeToPremiumRecruiter);

router.post("/me/experiences", protect, createExperience);

router.post("/me/educations", protect, createEducation);

router.delete("/me/skills/:skillId", protect, deleteSkill);

router.delete("/me/experiences/:experienceId", protect, deleteExperience);

router.delete("/me/educations/:educationId", protect, deleteEducation);

router.put("/me/experiences/:experienceId", protect, updateExperienceHandler);

router.put("/me/educations/:educationId", protect, updateEducationHandler);

router.post("/me/educations/:educationId/verify", protect, verifyCollegeEmailHandler);

router.post("/me/experiences/:experienceId/verify", protect, verifyWorkEmailHandler);

router.get("/:userId", protect, getUserFull);

export default router;
