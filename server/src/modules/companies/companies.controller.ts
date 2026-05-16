import {
  Request,
  Response,
} from "express";

import asyncHandler
from "shared/utils/asyncHandler";

import {
  successResponse,
} from "shared/utils/apiResponse";

import {
  createCompany,
  getCompanies,
  getCompanyBySlug,
  getCompanyEmployees,
} from "./companies.service";

import {
  createCompanySchema,
} from "./companies.validation";

export const createCompanyHandler =  asyncHandler(
    async (
      req: any,
      res: Response
    ) => {

      const validatedData =
        createCompanySchema.parse(
          req.body
        );

      const company =
        await createCompany(
          validatedData
        );

      res.status(201).json(
        successResponse(
          company,
          "Company created"
        )
      );
    }
  );

export const getCompaniesHandler =  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const companies =
        await getCompanies();

      res.json(
        successResponse(
          companies
        )
      );
    }
  );

export const getCompanyBySlugHandler =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const slug =
        req.params.slug as string;

      const company =
        await getCompanyBySlug(
          slug
        );

      res.json(
        successResponse(company)
      );
    }
  );

export const getCompanyEmployeesHandler =
  asyncHandler(
    async (
      req: Request,
      res: Response
    ) => {

      const companyId =
        req.params.companyId as string;

      const employees =
        await getCompanyEmployees(
          companyId
        );

      res.json(
        successResponse(
          employees
        )
      );
    }
  );