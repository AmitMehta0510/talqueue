import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import bcrypt from "bcryptjs";
import { Prisma, UserStatus } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import AppError from "shared/errors/AppError";
import { generateToken, verifyToken } from "shared/utils/jwt";
import { authUserSelect } from "./auth.selectors";
import {
  LoginInput,
  publicSignupRoles,
  RegisterInput,
} from "./auth.validation";

const BCRYPT_ROUNDS = 12;
const PUBLIC_SIGNUP_ROLES = new Set<string>(publicSignupRoles);

// Redis key prefix for revoked token hashes.
// Each key is stored with a TTL equal to the token's remaining lifetime so
// Redis handles expiry automatically — no prune loop needed.
const REVOKED_TOKEN_KEY_PREFIX = "auth:revoked:";

const buildRevokedKey = (tokenHash: string) =>
  `${REVOKED_TOKEN_KEY_PREFIX}${tokenHash}`;

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
    console.warn("[Auth] Redis revocation check failed — treating token as valid:", err?.message);
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

    return {
      token,
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

  const token = generateToken(safeUser.id);

  return {
    token,
    user: safeUser,
  };
};

export const logoutUser = async (token: string) => {
  const decoded = verifyToken(token);
  const expiresAt = decoded.exp ? decoded.exp * 1000 : Date.now();

  const ttlSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));

  if (ttlSeconds > 0) {
    const tokenHash = hashToken(token);
    try {
      // Store the hash with a TTL equal to the token's remaining lifetime.
      // Redis will auto-expire the key, so no prune job is needed.
      await redis.setex(buildRevokedKey(tokenHash), ttlSeconds, "1");
    } catch (err: any) {
      // Log but don't surface — the client session will still be cleared.
      console.warn("[Auth] Redis revocation write failed:", err?.message);
    }
  }

  return {
    loggedOut: true,
  };
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

  console.log(`[EmailVerification] Verification code for ${email} is '${otpCode}'`);

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
    console.log(`[ForgotPassword] Password reset token for ${email} is '${token}'`);
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


