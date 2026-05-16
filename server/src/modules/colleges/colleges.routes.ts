import { Router } from "express";

import {
  createCollegeHandler,
  createDepartmentHandler,
  getCollegesHandler,
  getDepartmentsHandler,
  searchCollegesHandler,
} from "./colleges.controller";

const router = Router();

router.post("/", createCollegeHandler);

router.get("/", getCollegesHandler);

router.get("/search", searchCollegesHandler);

router.post(
  "/departments",
  createDepartmentHandler
);

router.get(
  "/:collegeId/departments",
  getDepartmentsHandler
);

export default router;