import { Request, Response, NextFunction } from "express";
import AppError from "shared/errors/AppError";

const PLATFORM_ADMIN_ROLES = new Set([
  "PLATFORM_ADMIN",
]);

/**
 * Express middleware that blocks non-platform-admin users.
 * Must be used AFTER the `protect` middleware.
 */
export const requirePlatformAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = req.user;

  if (!user) {
    return next(new AppError("Unauthorized", 401));
  }

  const roleNames = new Set(
    (user.roles || [])
      .map((ur: any) => ur.role?.name)
      .filter(Boolean),
  );

  const isAdmin = [...PLATFORM_ADMIN_ROLES].some((r) => roleNames.has(r));

  if (!isAdmin) {
    return next(new AppError("Only the platform administrator (PLATFORM_ADMIN) can access this resource", 403));
  }

  next();
};
