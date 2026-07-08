import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";
import { validate } from "shared/middleware/validate.middleware";

import {
  AddEducationSchema,
  AddExperienceSchema,
  AddSkillSchema,
  CreateCustomSkillSchema,
  SearchSkillsQuerySchema,
  UpdateEducationSchema,
  UpdateExperienceSchema,
  UpdateProfileSchema,
} from "./users.validation";

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
router.get("/skills/search", protect, validate(SearchSkillsQuerySchema, "query"), searchSkillsHandler);

router.put("/me", protect, validate(UpdateProfileSchema), updateMe);

router.post("/me/skills", protect, validate(AddSkillSchema), createSkill);
router.post("/me/skills/verify", protect, verifyMySkills);
router.post("/me/upgrade-premium", protect, upgradeToPremiumRecruiter);
router.post("/skills/create-custom", protect, validate(CreateCustomSkillSchema), createCustomSkillHandler);

router.post("/me/experiences", protect, validate(AddExperienceSchema), createExperience);
router.post("/me/educations", protect, validate(AddEducationSchema), createEducation);

router.delete("/me/skills/:skillId", protect, deleteSkill);
router.delete("/me/experiences/:experienceId", protect, deleteExperience);
router.delete("/me/educations/:educationId", protect, deleteEducation);

router.put("/me/experiences/:experienceId", protect, validate(UpdateExperienceSchema), updateExperienceHandler);
router.put("/me/educations/:educationId", protect, validate(UpdateEducationSchema), updateEducationHandler);

router.post("/me/educations/:educationId/verify", protect, verifyCollegeEmailHandler);
router.post("/me/experiences/:experienceId/verify", protect, verifyWorkEmailHandler);

router.get("/:userId", protect, getUserFull);

export default router;

