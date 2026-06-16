import { Request, Response, NextFunction } from "express";
import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";

const PLATFORM_ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"]);

/**
 * Express middleware that blocks non-college-admin users.
 * Must be used AFTER the `protect` middleware.
 * Expects `req.params.collegeId` to be present.
 */
export const requireCollegeAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = req.user;
  const collegeId = req.params.collegeId as string;

  if (!user) {
    return next(new AppError("Unauthorized", 401));
  }

  if (!collegeId) {
    return next(new AppError("College ID is required in route params", 400));
  }

  // Platform admins bypass college admin checks
  const roleNames = new Set(
    (user.roles || [])
      .map((ur: any) => ur.role?.name)
      .filter((name): name is string => Boolean(name)),
  );

  const isPlatformAdmin = [...PLATFORM_ADMIN_ROLES].some((role) => roleNames.has(role));
  if (isPlatformAdmin) {
    return next();
  }

  // Check database for specific CollegeAdmin mapping
  const adminRecord = await prisma.collegeAdmin.findFirst({
    where: {
      userId: user.id,
      collegeId,
    },
    select: { id: true },
  });

  if (!adminRecord) {
    return next(new AppError("Access restricted to College Administrators", 403));
  }

  next();
};
