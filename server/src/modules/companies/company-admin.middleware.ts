import { Request, Response, NextFunction } from "express";
import AppError from "shared/errors/AppError";
import prisma from "shared/database/prisma";

/**
 * Middleware that restricts access to the Company Global Admin.
 * Resolves slug -> ID if needed, then verifies userId + companyId match in CompanyAdmin
 * table with officeCity set to null.
 */
export const requireCompanyGlobalAdmin = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    if (!user) {
      return next(new AppError("Unauthorized", 401));
    }

    const { companyId } = req.params;
    if (!companyId) {
      return next(new AppError("Company ID is required", 400));
    }

    // Resolve companyId if it is a slug (slugs don't have 36 character length for UUIDs)
    let targetCompanyId = companyId;
    if (companyId.length !== 36) {
      const company = await prisma.company.findUnique({
        where: { slug: companyId },
        select: { id: true }
      });
      if (!company) {
        return next(new AppError("Company not found", 404));
      }
      targetCompanyId = company.id;
      // Update req.params so subsequent handlers have direct access to the UUID
      req.params.companyId = targetCompanyId;
    }

    // Check if user is a Company Global Admin for targetCompanyId (officeCity === null)
    const isAdmin = await prisma.companyAdmin.findFirst({
      where: {
        userId: user.id,
        companyId: targetCompanyId,
        officeCity: null,
      },
    });

    if (!isAdmin) {
      return next(new AppError("Access denied: Company Global Admin privileges required", 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};
