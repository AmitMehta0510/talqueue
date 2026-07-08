import { Request, Response, NextFunction } from "express";

import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import { verifyToken } from "shared/utils/jwt";

import { authUserSelect } from "./auth.selectors";
import { isTokenRevoked } from "./auth.service";

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return next(
      new AppError("Unauthorized", 401)
    );
  }

  try {
    if (await isTokenRevoked(token)) {
      return next(new AppError("Invalid token", 401));
    }

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
      select: authUserSelect,
    });

    if (!user) {
      return next(
        new AppError("Invalid token", 401)
      );
    }

    if (user.status !== "ACTIVE") {
      return next(
        new AppError("User account is not active", 403)
      );
    }

    req.user = user;
    next();
  } catch {
    next(new AppError("Invalid token", 401));
  }
};

export const optionalProtect = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return next();
  }

  try {
    if (await isTokenRevoked(token)) {
      return next();
    }

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
      select: authUserSelect,
    });

    if (!user || user.status !== "ACTIVE") {
      return next();
    }

    req.user = user;
    next();
  } catch {
    next();
  }
};
