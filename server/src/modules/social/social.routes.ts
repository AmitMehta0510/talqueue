import { Router } from "express";

import { protect, optionalProtect }
from "modules/auth/auth.middleware";

import {
  followUserHandler,
  unfollowUserHandler,
  sendConnectionRequestHandler,
  reviewConnectionRequestHandler,
  getFollowersHandler,
  getFollowingHandler,
  getConnectionsHandler,
  suggestedConnectionsHandler,
  mutualConnectionsHandler,
} from "./social.controller";

const router = Router();

router.post(
  "/follow/:userId",
  protect,
  followUserHandler
);

router.delete(
  "/follow/:userId",
  protect,
  unfollowUserHandler
);

router.post(
  "/connect/:userId",
  protect,
  sendConnectionRequestHandler
);

router.patch(
  "/connections/:connectionId/review",
  protect,
  reviewConnectionRequestHandler
);

router.get(
  "/followers/:userId",
  optionalProtect,
  getFollowersHandler
);

router.get(
  "/following/:userId",
  optionalProtect,
  getFollowingHandler
);

router.get(
  "/connections/:userId",
  getConnectionsHandler
);

router.get(
  "/suggested",
  protect,
  suggestedConnectionsHandler
);

router.get(
  "/mutual/:userId",
  protect,
  mutualConnectionsHandler
);

export default router;