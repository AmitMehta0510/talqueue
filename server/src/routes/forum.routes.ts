import { Router } from "express";
import { protect } from "modules/auth/auth.middleware";
import { searchForumPostsHandler } from "controllers/forumSearchController";

const router = Router();

/**
 * POST /api/v1/forum/search
 * Protected endpoint to search forum posts.
 */
router.post("/search", protect, searchForumPostsHandler);

export default router;
