import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import { requirePlatformAdmin } from "shared/middleware/requirePlatformAdmin";

import {
  listInterviewsHandler,
  getInterviewHandler,
  toggleSaveInterviewHandler,
  createInterviewHandler,
  updateInterviewHandler,
  deleteInterviewHandler,
  triggerScrapeHandler,
  triggerValidationHandler,
} from "./interviews.controller";

const router = Router();

// ─── Public routes (no auth required) ────────────────────────────────────────

// GET /api/v1/interviews — paginated, filterable listing
router.get("/", listInterviewsHandler);

// GET /api/v1/interviews/:id — single resource detail
router.get("/:id", getInterviewHandler);

// ─── Auth-gated user actions ──────────────────────────────────────────────────

// POST /api/v1/interviews/:id/save — toggle bookmark
router.post("/:id/save", protect, toggleSaveInterviewHandler);

// ─── Platform admin actions ───────────────────────────────────────────────────

// POST /api/v1/interviews — manually create a resource
router.post("/", protect, requirePlatformAdmin, createInterviewHandler);

// PUT /api/v1/interviews/:id — update a resource
router.put("/:id", protect, requirePlatformAdmin, updateInterviewHandler);

// DELETE /api/v1/interviews/:id — soft-delete a resource
router.delete("/:id", protect, requirePlatformAdmin, deleteInterviewHandler);

// POST /api/v1/interviews/scrape — trigger manual re-seed
router.post("/scrape", protect, requirePlatformAdmin, triggerScrapeHandler);

// POST /api/v1/interviews/validate — trigger manual YouTube availability check
router.post("/validate", protect, requirePlatformAdmin, triggerValidationHandler);

export default router;
