import { Router } from "express";

import { protect } from "modules/auth/auth.middleware";
import { requireCollegeAdmin } from "shared/middleware/requireCollegeAdmin";

import {
  createCollegeHandler,
  createDepartmentHandler,
  getCollegesHandler,
  getCollegeHandler,
  getDepartmentsHandler,
  searchCollegesHandler,
  importCollegesHandler,
  getStandardDepartmentsHandler,
  deleteCollegeHandler,
  listCdcrMembersHandler,
  assignCdcrMemberHandler,
  removeCdcrMemberHandler,
  searchCollegeStudentsHandler,
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

router.get("/:collegeId", getCollegeHandler);

router.get(
  "/:collegeId/departments",
  getDepartmentsHandler
);

router.delete(
  "/:collegeId",
  protect,
  deleteCollegeHandler
);

// TPO Admin CDCR management routes
router.get(
  "/:collegeId/tpo/cdcr",
  protect,
  requireCollegeAdmin,
  listCdcrMembersHandler
);

router.post(
  "/:collegeId/tpo/cdcr",
  protect,
  requireCollegeAdmin,
  assignCdcrMemberHandler
);

router.delete(
  "/:collegeId/tpo/cdcr/:userId",
  protect,
  requireCollegeAdmin,
  removeCdcrMemberHandler
);

router.get(
  "/:collegeId/tpo/students",
  protect,
  requireCollegeAdmin,
  searchCollegeStudentsHandler
);

export default router;
