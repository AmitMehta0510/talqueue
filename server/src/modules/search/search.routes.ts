import { Router } from "express";
import { protect } from "../auth/auth.middleware";

import {
  globalSearchHandler,
  searchUsersHandler,
  searchProjectsHandler,
  searchHackathonsHandler,

} from "./search.controller";

const router = Router();

router.get(
  "/global",
  globalSearchHandler
);

router.get(
  "/users",
  searchUsersHandler
);

router.get(
  "/projects",
  searchProjectsHandler
);


router.get(
  "/hackathons",
  searchHackathonsHandler
);


export default router;