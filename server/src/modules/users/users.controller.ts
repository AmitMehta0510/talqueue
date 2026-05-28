import { Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import {
  addEducation,
  addExperience,
  addSkill,
  getMyEducations,
  getMyExperiences,
  getMyFullProfile,
  getMyProfile,
  getMySkills,
  getUserFullProfile,
  searchSkills,
  updateProfile,
} from "./users.service";

import {
  addEducationSchema,
  addExperienceSchema,
  addSkillSchema,
  updateProfileSchema,
} from "./users.validation";

export const getMe = asyncHandler(
  async (req: any, res: Response) => {
    const profile = await getMyProfile(
      req.user.id
    );

    res.json(
      successResponse(profile)
    );
  }
);

const getPaginationParams = (req: any) => ({
  cursor:
    (req.query.cursor as string) ||
    undefined,

  limit:
    Number.parseInt(
      (req.query.limit as string) || "20",
      10
    ) || 20,
});

export const getMeFull = asyncHandler(
  async (req: any, res: Response) => {
    const profile = await getMyFullProfile(
      req.user.id
    );

    res.json(
      successResponse(profile)
    );
  }
);

export const getUserFull = asyncHandler(
  async (req: any, res: Response) => {
    const profile = await getUserFullProfile(
      req.params.userId,
    );

    res.json(
      successResponse(profile)
    );
  }
);

export const getMeSkills = asyncHandler(
  async (req: any, res: Response) => {
    const skills = await getMySkills(
      req.user.id,
      getPaginationParams(req)
    );

    res.json(
      successResponse(skills)
    );
  }
);

export const getMeExperiences = asyncHandler(
  async (req: any, res: Response) => {
    const experiences = await getMyExperiences(
      req.user.id,
      getPaginationParams(req)
    );

    res.json(
      successResponse(experiences)
    );
  }
);

export const getMeEducations = asyncHandler(
  async (req: any, res: Response) => {
    const educations = await getMyEducations(
      req.user.id,
      getPaginationParams(req)
    );

    res.json(
      successResponse(educations)
    );
  }
);

export const searchSkillsHandler = asyncHandler(
  async (req: any, res: Response) => {
    const skills = await searchSkills(
      req.query.q?.toString() || "",
      req.query.limit ? Number(req.query.limit) : 12,
    );

    res.json(
      successResponse(skills)
    );
  }
);

export const updateMe = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData =
      updateProfileSchema.parse(req.body);

    const updatedProfile =
      await updateProfile(
        req.user.id,
        validatedData
      );

    res.json(
      successResponse(
        updatedProfile,
        "Profile updated"
      )
    );
  }
);

export const createSkill = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData =
      addSkillSchema.parse(req.body);

    const skill = await addSkill(
      req.user.id,
      validatedData
    );

    res.status(201).json(
      successResponse(
        skill,
        "Skill added"
      )
    );
  }
);

export const createExperience =
  asyncHandler(
    async (req: any, res: Response) => {
      const validatedData =
        addExperienceSchema.parse(req.body);

      const experience =
        await addExperience(
          req.user.id,
          validatedData
        );

      res.status(201).json(
        successResponse(
          experience,
          "Experience added"
        )
      );
    }
  );

export const createEducation =
  asyncHandler(
    async (req: any, res: Response) => {
      const validatedData =
        addEducationSchema.parse(req.body);

      const education =
        await addEducation(
          req.user.id,
          validatedData
        );

      res.status(201).json(
        successResponse(
          education,
          "Education added"
        )
      );
    }
  );
