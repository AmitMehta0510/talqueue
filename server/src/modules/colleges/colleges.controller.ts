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
} from "./colleges.service";

import {
  createCollegeSchema,
  createDepartmentSchema,
} from "./colleges.validation";

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
      const query =
        req.query.q?.toString() || "";

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
    const query = req.query.q?.toString() || "";
    const students = await searchCollegeStudents(collegeId as string, query);
    res.json(successResponse(students));
  }
);


