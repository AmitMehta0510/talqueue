import { Request, Response } from "express";
import asyncHandler from "shared/utils/asyncHandler";

import {
  loginUser,
  registerUser,
} from "./auth.service";

import {
  loginSchema,
  registerSchema,
} from "./auth.validation";

import { successResponse } from "shared/utils/apiResponse";

export const register = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedData =
      registerSchema.parse(req.body);

    const result = await registerUser(validatedData);

    res.status(201).json(
      successResponse(result, "User registered")
    );
  }
);

export const login = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedData =
      loginSchema.parse(req.body);

    const result = await loginUser(validatedData);

    res.json(
      successResponse(result, "Login successful")
    );
  }
);

export const me = asyncHandler(
  async (req: any, res: Response) => {
    res.json(
      successResponse(req.user)
    );
  }
);