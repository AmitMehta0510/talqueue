import { Request, Response } from "express";
import asyncHandler from "shared/utils/asyncHandler";

import {
  loginUser,
  logoutUser,
  registerUser,
} from "./auth.service";

import {
  loginSchema,
  registerSchema,
} from "./auth.validation";

import { successResponse } from "shared/utils/apiResponse";
import AppError from "shared/errors/AppError";

const getBearerToken = (req: Request) =>
  req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

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

export const logout = asyncHandler(
  async (req: Request, res: Response) => {
    const token = getBearerToken(req);

    if (!token) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await logoutUser(token);

    res.json(
      successResponse(result, "Logout successful")
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
