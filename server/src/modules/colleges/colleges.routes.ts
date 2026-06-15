import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";

import {
  createCollegeHandler,
  createDepartmentHandler,
  getCollegesHandler,
  getDepartmentsHandler,
  searchCollegesHandler,
  importCollegesHandler,
  getStandardDepartmentsHandler,
} from "./colleges.controller";

const router = Router();

router.post(
  "/",
  protect,
  createCollegeHandler
);

router.post(
  "/import",
  protect,
  importCollegesHandler
);

router.get("/", getCollegesHandler);

router.get("/search", searchCollegesHandler);

router.post(
  "/departments",
  protect,
  createDepartmentHandler
);

router.get(
  "/standard-departments",
  getStandardDepartmentsHandler
);

router.get(
  "/:collegeId/departments",
  getDepartmentsHandler
);

export default router;
