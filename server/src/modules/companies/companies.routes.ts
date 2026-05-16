import { Router }
from "express";

import { protect }
from "modules/auth/auth.middleware";

import {
  createCompanyHandler,
  getCompaniesHandler,
  getCompanyBySlugHandler,
  getCompanyEmployeesHandler,
} from "./companies.controller";

const router = Router();

router.post(
  "/",
  protect,
  createCompanyHandler
);

router.get(
  "/",
  getCompaniesHandler
);

router.get(
  "/:slug",
  getCompanyBySlugHandler
);

router.get(
  "/:companyId/employees",
  getCompanyEmployeesHandler
);

export default router;