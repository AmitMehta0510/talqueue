import { Request, Response, NextFunction } from "express";

import jwt from "jsonwebtoken";

import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import { env } from "shared/config/env";

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ")
  ) {
    return next(
      new AppError("Unauthorized", 401)
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded: any = jwt.verify(
      token,
      env.JWT_SECRET
    );

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
      include: {
        profile: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return next(
        new AppError("User not found", 404)
      );
    }

    req.user = user;

    next();
  } catch {
    next(new AppError("Invalid token", 401));
  }
};