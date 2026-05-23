import prisma from "shared/database/prisma";
import bcrypt from "bcryptjs";
import { Prisma, UserStatus } from "@prisma/client";
import { createHash } from "crypto";
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
const TOKEN_PRUNE_INTERVAL_MS = 60_000;
const revokedTokenHashes = new Map<string, number>();
let lastTokenPruneAt = 0;

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

const pruneExpiredRevokedTokens = (now = Date.now()) => {
  if (now - lastTokenPruneAt < TOKEN_PRUNE_INTERVAL_MS) {
    return;
  }

  for (const [tokenHash, expiresAt] of revokedTokenHashes) {
    if (expiresAt <= now) {
      revokedTokenHashes.delete(tokenHash);
    }
  }

  lastTokenPruneAt = now;
};

export const isTokenRevoked = (token: string) => {
  const now = Date.now();

  pruneExpiredRevokedTokens(now);

  const tokenHash = hashToken(token);
  const expiresAt = revokedTokenHashes.get(tokenHash);

  if (!expiresAt) {
    return false;
  }

  if (expiresAt <= now) {
    revokedTokenHashes.delete(tokenHash);
    return false;
  }

  return true;
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

  if (expiresAt > Date.now()) {
    pruneExpiredRevokedTokens();
    revokedTokenHashes.set(hashToken(token), expiresAt);
  }

  return {
    loggedOut: true,
  };
};
