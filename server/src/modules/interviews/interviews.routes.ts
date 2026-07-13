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
  createInterviewRoomHandler,
  listInterviewRoomsHandler,
  getInterviewRoomDetailHandler,
  evaluateInterviewRoomHandler,
} from "./interviews.controller";

const router = Router();

// ─── Live Mock Rooms (Authenticated) ──────────────────────────────────────────

// POST /api/v1/interviews/rooms — schedule/create a mock interview room
router.post("/rooms", protect, createInterviewRoomHandler);

// GET /api/v1/interviews/rooms — list rooms where the authenticated user is host/guest
router.get("/rooms", protect, listInterviewRoomsHandler);

// GET /api/v1/interviews/rooms/:roomId — single room details
router.get("/rooms/:roomId", protect, getInterviewRoomDetailHandler);

// POST /api/v1/interviews/rooms/:roomId/evaluate — run AI evaluation of the transcript
router.post("/rooms/:roomId/evaluate", protect, evaluateInterviewRoomHandler);

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

