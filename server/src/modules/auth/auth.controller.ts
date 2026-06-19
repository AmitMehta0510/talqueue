import { Request, Response } from "express";
import asyncHandler from "shared/utils/asyncHandler";

import {
  loginUser,
  logoutUser,
  registerUser,
  triggerEmailVerificationOTP,
  verifyOtpToken,
  initiateForgotPasswordFlow,
  executePasswordReset,
} from "./auth.service";

import {
  loginSchema,
  registerSchema,
  sendOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
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

export const sendOtp = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedData = sendOtpSchema.parse(req.body);
    const result = await triggerEmailVerificationOTP(validatedData.email);
    res.json(successResponse(result, "Verification code triggered successfully."));
  }
);

export const verifyOtp = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedData = verifyOtpSchema.parse(req.body);
    const result = await verifyOtpToken(validatedData.email, validatedData.otp);
    res.json(successResponse(result, "Email verified successfully."));
  }
);

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedData = forgotPasswordSchema.parse(req.body);
    const result = await initiateForgotPasswordFlow(validatedData.email);
    res.json(successResponse(result, "If the email is registered, reset instructions have been sent."));
  }
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedData = resetPasswordSchema.parse(req.body);
    const result = await executePasswordReset(
      validatedData.email,
      validatedData.token,
      validatedData.newPassword
    );
    res.json(successResponse(result, "Password reset successfully."));
  }
);


