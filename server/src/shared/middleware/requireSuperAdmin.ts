import { Request, Response, NextFunction } from "express";
import AppError from "shared/errors/AppError";

/**
 * Express middleware that restricts access exclusively to SUPER_ADMIN users.
 * PLATFORM_ADMIN users are denied — use `requirePlatformAdmin` for general admin routes.
 * Must be used AFTER the `protect` middleware.
 */
export const requireSuperAdmin = (
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

  if (!roleNames.has("SUPER_ADMIN")) {
    return next(
      new AppError(
        "Access restricted to SUPER_ADMIN. This action requires elevated privileges.",
        403,
      ),
    );
  }

  next();
};
