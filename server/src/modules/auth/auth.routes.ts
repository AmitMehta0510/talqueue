import { Router } from "express";
import { protect } from "./auth.middleware";

import {
  login,
  logout,
  register,
  me,
} from "./auth.controller";

const router = Router();

router.get("/me", protect, me);
router.post("/register", register);
router.post("/login", login);
router.post("/logout", protect, logout);

export default router;
