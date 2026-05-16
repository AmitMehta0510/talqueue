import { Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import {
  addEducation,
  addExperience,
  addSkill,
  getMyProfile,
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