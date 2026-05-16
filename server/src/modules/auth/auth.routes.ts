import { Router } from "express";
import { protect } from "./auth.middleware";

import {
  login,
  register,
  me,
} from "./auth.controller";

const router = Router();

router.get("/me", protect, me);
router.post("/register", register);
router.post("/login", login);

export default router;