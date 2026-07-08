import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import bcrypt from "bcryptjs";
import { Prisma, UserStatus } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import AppError from "shared/errors/AppError";
import { generateToken, verifyToken } from "shared/utils/jwt";
import logger from "shared/logger";
import { env } from "shared/config/env";
import { authUserSelect } from "./auth.selectors";
import {
  LoginInput,
  publicSignupRoles,
  RegisterInput,
} from "./auth.validation";

const BCRYPT_ROUNDS = 12;
const PUBLIC_SIGNUP_ROLES = new Set<string>(publicSignupRoles);

// ─── Access Token Revocation ────────────────────────────────────────────────
// Redis key prefix for revoked access token hashes.
// Each key is stored with a TTL equal to the token's remaining lifetime so
// Redis handles expiry automatically — no prune loop needed.
const REVOKED_TOKEN_KEY_PREFIX = "auth:revoked:";
const buildRevokedKey = (tokenHash: string) =>
  `${REVOKED_TOKEN_KEY_PREFIX}${tokenHash}`;

// ─── Refresh Token ───────────────────────────────────────────────────────────
// Refresh tokens are opaque 64-byte random hex strings.
// We store a SHA-256 hash of the raw token in Redis (never the raw token itself)
// keyed as  auth:rt:<hash>  with a 30-day TTL.
// On rotation we atomically delete the old key and create a new one.
const REFRESH_TOKEN_KEY_PREFIX = "auth:rt:";
const REFRESH_TOKEN_TTL_SECONDS = Number(env.REFRESH_TOKEN_TTL_DAYS) * 24 * 60 * 60;

const buildRefreshKey = (tokenHash: string) =>
  `${REFRESH_TOKEN_KEY_PREFIX}${tokenHash}`;

const isUniqueConstraintError = (
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

const getUniqueConflictMessage = (error: unknown) => {
  if (!isUniqueConstraintError(error)) {
    return "Could not create user";
  }

  const target = error.meta?.target;
  const fields = Array.isArray(target) ? target : [target];

  if (fields.includes("email")) {
    return "User already exists";
  }

  if (fields.includes("username")) {
    return "Username already taken";
  }

  return "User already exists";
};

const assertActiveUser = (status: UserStatus) => {
  if (status !== UserStatus.ACTIVE) {
    throw new AppError("User account is not active", 403);
  }
};

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

// ─── Refresh Token Helpers ───────────────────────────────────────────────────

/**
 * Generates a new opaque refresh token for the given user, stores its hash in
 * Redis with a 30-day TTL, and returns the **raw** token to be sent to the
 * client as an HttpOnly cookie.
 */
export const generateRefreshToken = async (userId: string): Promise<string> => {
  const rawToken = randomBytes(64).toString("hex");
  const tokenHash = hashToken(rawToken);
  await redis.setex(buildRefreshKey(tokenHash), REFRESH_TOKEN_TTL_SECONDS, userId);
  return rawToken;
};

/**
 * Validates an incoming refresh token, deletes the old Redis entry (rotation),
 * and issues a fresh access token + refresh token pair.
 *
 * Throws 401 if the token is invalid or not found in Redis.
 */
export const rotateRefreshToken = async (rawToken: string) => {
  const tokenHash = hashToken(rawToken);
  const userId = await redis.get(buildRefreshKey(tokenHash));

  if (!userId) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  // Rotate: delete old RT and issue new pair atomically-ish
  await redis.del(buildRefreshKey(tokenHash));

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: authUserSelect,
  });

  if (!user || user.status !== "ACTIVE") {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const [accessToken, refreshToken] = await Promise.all([
    Promise.resolve(generateToken(userId)),
    generateRefreshToken(userId),
  ]);

  return { accessToken, refreshToken, user };
};
// ────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether a token has been revoked by looking up its SHA-256 hash
 * in Redis. Returns false (i.e. allows the request) if Redis is unavailable
 * so that a cache failure does not lock users out.
 */
export const isTokenRevoked = async (token: string): Promise<boolean> => {
  const tokenHash = hashToken(token);
  try {
    const val = await redis.get(buildRevokedKey(tokenHash));
    return val === "1";
  } catch (err: any) {
    logger.warn("Auth: Redis revocation check failed — treating token as valid", { err: err?.message });
    return false;
  }
};

export const registerUser = async (data: RegisterInput) => {
  const { email, password, fullName, username, role } = data;

  if (!PUBLIC_SIGNUP_ROLES.has(role)) {
    throw new AppError(
      "This role cannot be selected during public signup",
      403,
    );
  }

  const [existingUser, foundRole] = await Promise.all([
    prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
      select: {
        email: true,
        username: true,
      },
    }),

    prisma.role.findUnique({
      where: {
        name: role,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (existingUser?.email === email) {
    throw new AppError("User already exists", 400);
  }

  if (existingUser?.username === username) {
    throw new AppError("Username already taken", 400);
  }

  if (!foundRole) {
    throw new AppError("Invalid role", 400);
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        primaryRole: role,
        profile: {
          create: {
            fullName,
          },
        },
        roles: {
          create: {
            roleId: foundRole.id,
          },
        },
      },
      select: authUserSelect,
    });

    const token = generateToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

    return {
      token,
      refreshToken,
      user,
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(getUniqueConflictMessage(error), 400);
    }

    throw error;
  }
};

export const loginUser = async (data: LoginInput) => {
  const { email, password } = data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      ...authUserSelect,
      password: true,
    },
  });

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const { password: hashedPassword, ...safeUser } = user;
  const isMatch = await bcrypt.compare(password, hashedPassword);

  if (!isMatch) {
    throw new AppError("Invalid credentials", 401);
  }

  assertActiveUser(safeUser.status);

  const accessToken = generateToken(safeUser.id);
  const refreshToken = await generateRefreshToken(safeUser.id);

  return {
    token: accessToken,
    refreshToken,
    user: safeUser,
  };
};

export const logoutUser = async (accessToken: string, rawRefreshToken?: string) => {
  // Revoke the access token
  const decoded = verifyToken(accessToken);
  const expiresAt = decoded.exp ? decoded.exp * 1000 : Date.now();
  const ttlSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));

  if (ttlSeconds > 0) {
    const tokenHash = hashToken(accessToken);
    try {
      await redis.setex(buildRevokedKey(tokenHash), ttlSeconds, "1");
    } catch (err: any) {
      logger.warn("Auth: Redis revocation write failed", { err: err?.message });
    }
  }

  // Also revoke the refresh token if provided
  if (rawRefreshToken) {
    const rtHash = hashToken(rawRefreshToken);
    try {
      await redis.del(buildRefreshKey(rtHash));
    } catch (err: any) {
      logger.warn("Auth: refresh token revocation failed", { err: err?.message });
    }
  }

  return { loggedOut: true };
};

export const triggerEmailVerificationOTP = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const redisKey = `otp:email:${email}`;

  await redis.setex(redisKey, 600, otpCode);

  logger.debug("EmailVerification: OTP generated", { email });

  return {
    success: true,
    message: `Verification code sent to ${email}.`,
  };
};

export const verifyOtpToken = async (email: string, otp: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Testing Master Bypass Sandbox
  if (process.env.NODE_ENV !== "production" && otp === "123456") {
    await prisma.user.update({
      where: { email },
      data: { isEmailVerified: true },
    });

    return {
      success: true,
      message: "Email verified successfully (sandbox bypass).",
    };
  }

  const redisKey = `otp:email:${email}`;
  const storedOtp = await redis.get(redisKey);

  if (!storedOtp || storedOtp !== otp) {
    throw new AppError("Invalid or expired OTP", 400);
  }

  await prisma.user.update({
    where: { email },
    data: { isEmailVerified: true },
  });

  await redis.del(redisKey);

  return {
    success: true,
    message: "Email verified successfully.",
  };
};

export const initiateForgotPasswordFlow = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    const token = randomBytes(16).toString("hex");
    const redisKey = `password:reset:${email}`;
    await redis.setex(redisKey, 900, token);
    logger.debug("ForgotPassword: reset token generated", { email });
  }

  // User-enumeration protection: return success regardless of user existence
  return {
    success: true,
    message: "If the email is registered, a password reset token has been generated.",
  };
};

export const executePasswordReset = async (
  email: string,
  token: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Testing Master Bypass Integration
  if (process.env.NODE_ENV !== "production" && token === "123456") {
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    return {
      success: true,
      message: "Password reset successfully (sandbox bypass).",
    };
  }

  const redisKey = `password:reset:${email}`;
  const storedToken = await redis.get(redisKey);

  if (!storedToken || storedToken !== token) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  await redis.del(redisKey);

  return {
    success: true,
    message: "Password reset successfully.",
  };
};


