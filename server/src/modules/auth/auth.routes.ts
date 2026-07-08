import { Router } from "express";
import { protect } from "./auth.middleware";

import {
  login,
  logout,
  refresh,
  register,
  me,
  sendOtp,
  verifyOtp,
  forgotPassword,
  resetPassword,
} from "./auth.controller";

const router = Router();

router.get("/me", protect, me);
router.post("/register", register);
router.post("/login", login);
// Cookie-only, no Authorization header required — rotateRefreshToken validates the token internally
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
