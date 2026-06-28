import { Request, Response, NextFunction } from "express";
import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";

const PLATFORM_ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"]);

/**
 * Express middleware that allows access to college TPOs.
 * Hierarchy: CollegeAdmin > TPO > CDCR
 *
 * Passes if the user is:
 *  1. A platform/super admin (bypass), OR
 *  2. A CollegeAdmin for this college, OR
 *  3. The TPO (CollegeTpo record) for this college
 *
 * Must be used AFTER the `protect` middleware.
 * Expects `req.params.collegeId` to be present (UUID).
 */
export const requireTpoAccess = async (
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

  // Platform admins bypass all college checks
  const roleNames = new Set(
    (user.roles || [])
      .map((ur: any) => ur.role?.name)
      .filter((name): name is string => Boolean(name)),
  );

  if ([...PLATFORM_ADMIN_ROLES].some((r) => roleNames.has(r))) {
    return next();
  }

  // CollegeAdmin also satisfies TPO-level access (higher privilege)
  const [adminRecord, tpoRecord] = await Promise.all([
    prisma.collegeAdmin.findFirst({
      where: { userId: user.id, collegeId },
      select: { id: true },
    }),
    prisma.collegeTpo.findFirst({
      where: { userId: user.id, collegeId },
      select: { id: true },
    }),
  ]);

  if (!adminRecord && !tpoRecord) {
    return next(new AppError("Access restricted to College TPO", 403));
  }

  next();
};
