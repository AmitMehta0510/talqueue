import { Router } from "express";
import { protect } from "./auth.middleware";

import {
  login,
  logout,
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
router.post("/logout", protect, logout);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
