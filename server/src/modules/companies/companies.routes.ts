import { Router }
from "express";

import { protect }
from "modules/auth/auth.middleware";

import {
  createCompanyHandler,
  getCompaniesHandler,
  getCompanyBySlugHandler,
  getCompanyEmployeesHandler,
  seedCompaniesHandler,
  getCompanyReferrersHandler,
  requestCompanyRegistrationHandler,
  followCompanyHandler,
  unfollowCompanyHandler,
} from "./companies.controller";

const router = Router();

router.post(
  "/",
  protect,
  createCompanyHandler
);

router.post(
  "/seed",
  protect,
  seedCompaniesHandler
);

router.post(
  "/request",
  protect,
  requestCompanyRegistrationHandler
);

router.post(
  "/:companyId/follow",
  protect,
  followCompanyHandler
);

router.post(
  "/:companyId/unfollow",
  protect,
  unfollowCompanyHandler
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

router.get(
  "/:companyId/referrers",
  protect,
  getCompanyReferrersHandler
);

export default router;