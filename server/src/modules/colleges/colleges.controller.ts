import { Request, Response } from "express";

import asyncHandler from "shared/utils/asyncHandler";

import { successResponse } from "shared/utils/apiResponse";

import {
  createCollege,
  createDepartment,
  getAllColleges,
  getDepartmentsByCollege,
  searchColleges,
} from "./colleges.service";

import {
  createCollegeSchema,
  createDepartmentSchema,
} from "./colleges.validation";

export const createCollegeHandler =
  asyncHandler(
    async (req: Request, res: Response) => {
      const validatedData =
        createCollegeSchema.parse(req.body);

      const college =
        await createCollege(validatedData);

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
        await getAllColleges();

      res.json(
        successResponse(colleges)
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
    async (req: Request, res: Response) => {
      const validatedData =
        createDepartmentSchema.parse(
          req.body
        );

      const department =
        await createDepartment(
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