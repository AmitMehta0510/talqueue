import { Request, Response } from "express";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";
import {
  interviewQuerySchema,
  createInterviewResourceSchema,
  updateInterviewResourceSchema,
} from "./interviews.validation";
import {
  getInterviewResources,
  getInterviewResourceById,
  toggleSaveInterviewResource,
  getSavedResourceIds,
  createInterviewResource,
  updateInterviewResource,
  deleteInterviewResource,
  seedInterviewResources,
} from "./interviews.service";
import { runInterviewSeed, validateYoutubeVideos } from "./interviews.scraper";


// ─── Public: List (paginated + filterable) ────────────────────────────────────

export const listInterviewsHandler = asyncHandler(async (req: any, res: Response) => {
  const params = interviewQuerySchema.parse(req.query);
  const result = await getInterviewResources(params);

  // If authenticated, annotate each card with saved state
  let savedIds = new Set<string>();
  if (req.user?.id) {
    savedIds = await getSavedResourceIds(req.user.id);
  }

  const data = result.data.map((r: any) => ({
    ...r,
    isSaved: savedIds.has(r.id),
  }));

  res.json(successResponse({ ...result, data }));
});

// ─── Public: Single resource ──────────────────────────────────────────────────

export const getInterviewHandler = asyncHandler(async (req: any, res: Response) => {
  const resource = await getInterviewResourceById(req.params.id as string);
  let isSaved = false;
  if (req.user?.id) {
    const saved = await getSavedResourceIds(req.user.id);
    isSaved = saved.has(resource.id);
  }
  res.json(successResponse({ ...resource, isSaved }));
});

// ─── Auth-gated: Toggle save ──────────────────────────────────────────────────

export const toggleSaveInterviewHandler = asyncHandler(async (req: any, res: Response) => {
  const result = await toggleSaveInterviewResource(req.user.id, req.params.id as string);
  res.json(successResponse(result, result.saved ? "Resource saved" : "Resource unsaved"));
});

// ─── Admin: Create ────────────────────────────────────────────────────────────

export const createInterviewHandler = asyncHandler(async (req: any, res: Response) => {
  const data = createInterviewResourceSchema.parse(req.body);
  const resource = await createInterviewResource(data, req.user.id);
  res.status(201).json(successResponse(resource, "Interview resource created"));
});

// ─── Admin: Update ────────────────────────────────────────────────────────────

export const updateInterviewHandler = asyncHandler(async (req: any, res: Response) => {
  const data = updateInterviewResourceSchema.parse(req.body);
  const resource = await updateInterviewResource(req.params.id as string, data);
  res.json(successResponse(resource, "Interview resource updated"));
});

// ─── Admin: Soft delete ───────────────────────────────────────────────────────

export const deleteInterviewHandler = asyncHandler(async (req: any, res: Response) => {
  const result = await deleteInterviewResource(req.params.id as string);
  res.json(successResponse(result, "Interview resource deleted"));
});

// ─── Admin: Manual validation trigger ───────────────────────────────────────

export const triggerValidationHandler = asyncHandler(async (_req: any, res: Response) => {
  console.log("[InterviewValidator] Manual validation triggered by admin");
  const result = await validateYoutubeVideos();
  res.json(
    successResponse(
      result,
      `Validation complete — checked: ${result.checked}, deactivated: ${result.deactivated}`,
    ),
  );
});

// ─── Admin: Manual scrape trigger ────────────────────────────────────────────

export const triggerScrapeHandler = asyncHandler(async (_req: any, res: Response) => {
  console.log("[InterviewScraper] Manual scrape triggered by admin");
  const result = await runInterviewSeed();
  res.json(
    successResponse(
      result,
      `Scrape complete — created: ${result.created}, updated: ${result.updated}`,
    ),
  );
});
