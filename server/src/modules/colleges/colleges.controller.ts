import { Request, Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";
import AppError from "shared/errors/AppError";

import { successResponse } from "shared/utils/apiResponse";

import {
  createCollege,
  createDepartment,
  getAllColleges,
  getCollegeById,
  getDepartmentsByCollege,
  searchColleges,
  importColleges,
  getStandardDepartments,
  deleteCollege,
  listCdcrMembers,
  assignCdcrMember,
  removeCdcrMember,
  searchCollegeStudents,
  claimAlumniStatus,
  getPendingAlumniClaims,
  approveAlumniClaim,
  rejectAlumniClaim,
  // Institutional B2B
  submitCollegeOnboarding,
  assignOrRemoveInstitutionalStaff,
  assignCellRepresentative,
  removeCellRepresentative,
} from "./colleges.service";

import * as analyticsService from "modules/placementDrives/driveAnalytics.service";

import {
  createCollegeSchema,
  createDepartmentSchema,
  submitCollegeRegistrationSchema,
  assignStaffSchema,
  assignCdcrSchema,
} from "./colleges.validation";

// V-03: Safety cap — prevent unbounded ILIKE scans
const MAX_QUERY_LEN = 200;

export const createCollegeHandler =
  asyncHandler(
    async (req: any, res: Response) => {
      const validatedData =
        createCollegeSchema.parse(req.body);

      const college =
        await createCollege(
          req.user,
          validatedData
        );

      res.status(201).json(
        successResponse(
          college,
          "College created successfully!"
        )
      );
    }
  );

export const getCollegesHandler =
  asyncHandler(
    async (req: Request, res: Response) => {
      const colleges =
        await getAllColleges({
          cursor:
            (req.query.cursor as string) ||
            undefined,

          limit:
            Number.parseInt(
              (req.query.limit as string) || "50",
              10
            ) || 50,
        });

      res.json(
        successResponse(colleges)
      );
    }
  );

export const getCollegeHandler =
  asyncHandler(
    async (req: Request<{ collegeId: string }>, res: Response) => {
      const { collegeId } = req.params;
      const college = await getCollegeById(collegeId);

      if (!college) {
        throw new AppError("College not found", 404);
      }

      res.json(
        successResponse(college)
      );
    }
  );

export const searchCollegesHandler =
  asyncHandler(
    async (req: Request, res: Response) => {
      // V-03: cap query length to prevent unbounded ILIKE full-table scans
      const query =
        (req.query.q?.toString() || "").slice(0, MAX_QUERY_LEN);

      const colleges =
        await searchColleges(query);

      res.json(
        successResponse(colleges)
      );
    }
  );

export const createDepartmentHandler =
  asyncHandler(
    async (req: any, res: Response) => {
      const validatedData =
        createDepartmentSchema.parse(
          req.body
        );

      const department =
        await createDepartment(
          req.user,
          validatedData
        );

      res.status(201).json(
        successResponse(
          department,
          "Department created successfully!"
        )
      );
    }
  );

export const getDepartmentsHandler =
  asyncHandler(
    async (
      req: Request<{ collegeId: string }>,
      res: Response
    ) => {

      const departments =
        await getDepartmentsByCollege(
          req.params.collegeId
        );

      res.json(
        successResponse(departments)
      );
    }
  );

export const importCollegesHandler =
  asyncHandler(
    async (req: any, res: Response) => {
      const colleges = Array.isArray(req.body.colleges) ? req.body.colleges :
                       Array.isArray(req.body) ? req.body : [req.body];
      const results = await importColleges(req.user, colleges);

      res.status(201).json(
        successResponse(
          results,
          "Colleges imported successfully!"
        )
      );
    }
  );

export const getStandardDepartmentsHandler =
  asyncHandler(
    async (req: Request, res: Response) => {
      const depts = await getStandardDepartments();
      res.json(
        successResponse(depts)
      );
    }
  );

export const deleteCollegeHandler =
  asyncHandler(
    async (req: any, res: Response) => {
      const { collegeId } = req.params;
      await deleteCollege(req.user, collegeId);
      res.json(
        successResponse(
          null,
          "College deleted successfully!"
        )
      );
    }
  );

export const listCdcrMembersHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { collegeId } = req.params;
    const members = await listCdcrMembers(collegeId as string);
    res.json(successResponse(members));
  }
);

export const assignCdcrMemberHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { collegeId } = req.params;
    const { userId } = req.body;
    const assignment = await assignCdcrMember(req.user.id, userId, collegeId as string);
    res.status(201).json(successResponse(assignment, "CDCR representative assigned successfully!"));
  }
);

export const removeCdcrMemberHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { collegeId, userId } = req.params;
    await removeCdcrMember(userId as string, collegeId as string);
    res.json(successResponse(null, "CDCR representative removed successfully!"));
  }
);

export const searchCollegeStudentsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { collegeId } = req.params;
    // V-03: cap query length to prevent unbounded ILIKE full-table scans
    const query = (req.query.q?.toString() || "").slice(0, MAX_QUERY_LEN);
    const students = await searchCollegeStudents(collegeId as string, query);
    res.json(successResponse(students));
  }
);

export const claimAlumniStatusHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { collegeId } = req.params;
    const result = await claimAlumniStatus(req.user.id, collegeId as string);
    res.json(successResponse(result, "Alumni status claimed successfully!"));
  }
);

export const getPendingAlumniClaimsHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { collegeId } = req.params;
    const claims = await getPendingAlumniClaims(req.user, collegeId as string);
    res.json(successResponse(claims));
  }
);

export const approveAlumniClaimHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { collegeId, educationId } = req.params;
    const result = await approveAlumniClaim(req.user, collegeId as string, educationId as string);
    res.json(successResponse(result, "Alumni status verified successfully!"));
  }
);

export const rejectAlumniClaimHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { collegeId, educationId } = req.params;
    const result = await rejectAlumniClaim(req.user, collegeId as string, educationId as string);
    res.json(successResponse(result, "Alumni verification claim rejected."));
  }
);



// ─────────────────────────────────────────────────────────────────────────────
// INSTITUTIONAL B2B ONBOARDING HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /colleges/onboarding
 * Submit an institutional college onboarding request.
 * Auth: any authenticated user.
 */
export const submitCollegeOnboardingHandler = asyncHandler(
  async (req: any, res: Response) => {
    const validatedData = submitCollegeRegistrationSchema.parse(req.body);
    const result = await submitCollegeOnboarding(req.user.id, validatedData);
    res.status(201).json(
      successResponse(result, "Institutional onboarding request submitted successfully."),
    );
  },
);

/**
 * POST  /colleges/:collegeId/staff  (action: ASSIGN)
 * DELETE /colleges/:collegeId/staff (action: REMOVE)
 *
 * Assign or remove a TPO or HOD.
 * Auth: must be the verified master CollegeAdmin of the target college.
 */
export const assignOrRemoveInstitutionalStaffHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { collegeId } = req.params;
    const validatedData = assignStaffSchema.parse(req.body);

    const result = await assignOrRemoveInstitutionalStaff(
      req.user.id,
      collegeId as string,
      validatedData.targetUserId,
      validatedData.role,
      validatedData.action,
      validatedData.departmentId,
    );

    res.json(successResponse(result));
  },
);

/**
 * POST   /colleges/:collegeId/cdcr          → assign CDCR
 * DELETE /colleges/:collegeId/cdcr/:userId  → remove CDCR
 *
 * Auth: college TPO (college-wide) or HOD (department-scoped) or master CollegeAdmin.
 */
export const assignCellRepresentativesHandler = asyncHandler(
  async (req: any, res: Response) => {
    const { collegeId, userId: targetUserIdParam } = req.params;

    if (req.method === "DELETE") {
      // For DELETE, targetUserId comes from URL param, departmentId from query
      const targetUserId = targetUserIdParam as string;
      const departmentId = req.query.departmentId as string | undefined;

      const result = await removeCellRepresentative(
        req.user.id,
        targetUserId,
        collegeId as string,
        departmentId,
      );

      return res.json(successResponse(result));
    }

    // POST — assign
    const validatedData = assignCdcrSchema.parse(req.body);

    const result = await assignCellRepresentative(
      req.user.id,
      validatedData.targetUserId,
      collegeId as string,
      validatedData.departmentId,
    );

    return res.status(201).json(
      successResponse(result, "CDCR representative assigned successfully!"),
    );
  },
);

// ─── Public placement summary (no auth required) ──────────────────────────────
export const getCollegePlacementSummaryHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { collegeId } = req.params;
    const id = (Array.isArray(collegeId) ? collegeId[0] : collegeId) as string;
    // Only fetch current year stats for the public summary
    const currentYear = new Date().getFullYear();
    // Try current year first; fallback to all-time if no drives found
    let result = await analyticsService.getCollegePlacementStats(id, currentYear);
    if (result.summary.totalDrives === 0) {
      result = await analyticsService.getCollegePlacementStats(id);
    }
    res.json({
      success: true,
      data: {
        placementPercent: result.summary.placementPercent,
        avgPackageLPA: result.summary.avgPackageLPA,
        maxPackageLPA: result.summary.maxPackageLPA,
        totalDrives: result.summary.totalDrives,
        topRecruiters: result.byCompany.slice(0, 5).map((c) => ({
          companyId: c.companyId,
          companyName: c.companyName,
          companyLogo: c.companyLogo,
        })),
      },
    });
  },
);
