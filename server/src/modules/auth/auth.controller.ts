import { Request, Response } from "express";
import asyncHandler from "shared/utils/asyncHandler";

import {
  loginUser,
  logoutUser,
  registerUser,
  rotateRefreshToken,
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
import { env } from "shared/config/env";

// ─── Refresh Token Cookie Config ─────────────────────────────────────────────
const REFRESH_COOKIE = "ep_refresh_token";
const REFRESH_TTL_MS = Number(env.REFRESH_TOKEN_TTL_DAYS) * 24 * 60 * 60 * 1000;
const isProduction = env.NODE_ENV === "production";

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,        // HTTPS-only in production
    sameSite: "strict",          // CSRF protection
    maxAge: REFRESH_TTL_MS,
    path: "/api/v1/auth",        // Scoped to auth endpoints only
  });
};

const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/api/v1/auth",
  });
};
// ─────────────────────────────────────────────────────────────────────────────

const getBearerToken = (req: Request) =>
  req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

export const register = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedData = registerSchema.parse(req.body);
    const result = await registerUser(validatedData);

    setRefreshCookie(res, result.refreshToken);

    res.status(201).json(
      successResponse({ token: result.token, user: result.user }, "User registered")
    );
  }
);

export const login = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedData = loginSchema.parse(req.body);
    const result = await loginUser(validatedData);

    setRefreshCookie(res, result.refreshToken);

    res.json(
      successResponse({ token: result.token, user: result.user }, "Login successful")
    );
  }
);

/**
 * POST /auth/refresh
 *
 * Reads the refresh token from the HttpOnly cookie, validates it, rotates
 * it (issues a new RT + new AT), and returns the new access token in JSON.
 * No Authorization header required — the cookie carries the credential.
 */
export const refresh = asyncHandler(
  async (req: Request, res: Response) => {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];

    if (!rawRefreshToken) {
      throw new AppError("No refresh token", 401);
    }

    const result = await rotateRefreshToken(rawRefreshToken);

    // Issue the new refresh token as a rotated cookie
    setRefreshCookie(res, result.refreshToken);

    res.json(
      successResponse({ token: result.accessToken, user: result.user }, "Token refreshed")
    );
  }
);

export const logout = asyncHandler(
  async (req: Request, res: Response) => {
    const token = getBearerToken(req);
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];

    if (!token) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await logoutUser(token, rawRefreshToken);

    clearRefreshCookie(res);

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
