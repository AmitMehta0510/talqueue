import { PlacementDriveApplicationStatus } from "../../../lib/api";
import { AlertCircle, CheckCircle, Clock, Trophy, XCircle } from "lucide-react";
import React from "react";

// Status actions available to TPO/Recruiter in the dropdown
export const ACTIONABLE_STATUSES: PlacementDriveApplicationStatus[] = [
  "SHORTLISTED",
  "INTERVIEW_R1",
  "INTERVIEW_R2",
  "INTERVIEW_R3",
  "PPO_OFFERED",
  "SELECTED",
  "REJECTED",
];

export const STATUS_CONFIG: Record<
  PlacementDriveApplicationStatus,
  { label: string; bg: string; text: string; icon: React.ElementType }
> = {
  APPLIED: {
    label: "Applied",
    bg: "bg-blue-50 dark:bg-blue-955/40 border-blue-200 dark:border-blue-900/40",
    text: "text-blue-700 dark:text-blue-400",
    icon: AlertCircle,
  },
  SHORTLISTED: {
    label: "Shortlisted",
    bg: "bg-indigo-50 dark:bg-indigo-955/40 border-indigo-200 dark:border-indigo-900/40",
    text: "text-indigo-700 dark:text-indigo-400",
    icon: CheckCircle,
  },
  INTERVIEW_R1: {
    label: "Round 1 Interview",
    bg: "bg-amber-50 dark:bg-amber-955/40 border-amber-200 dark:border-amber-900/40",
    text: "text-amber-700 dark:text-amber-400",
    icon: Clock,
  },
  INTERVIEW_R2: {
    label: "Round 2 Interview",
    bg: "bg-amber-50 dark:bg-amber-955/40 border-amber-200 dark:border-amber-900/40",
    text: "text-amber-700 dark:text-amber-400",
    icon: Clock,
  },
  INTERVIEW_R3: {
    label: "Round 3 Interview",
    bg: "bg-amber-50 dark:bg-amber-955/40 border-amber-200 dark:border-amber-900/40",
    text: "text-amber-700 dark:text-amber-400",
    icon: Clock,
  },
  PPO_OFFERED: {
    label: "PPO Offered",
    bg: "bg-indigo-50 dark:bg-indigo-955/40 border-indigo-200 dark:border-indigo-900/40",
    text: "text-indigo-700 dark:text-indigo-400",
    icon: Trophy,
  },
  SELECTED: {
    label: "Selected 🎉",
    bg: "bg-violet-50 dark:bg-violet-955/40 border-violet-200 dark:border-violet-900/40",
    text: "text-violet-700 dark:text-violet-400",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Not Selected",
    bg: "bg-rose-50 dark:bg-rose-955/40 border-rose-200 dark:border-rose-900/40",
    text: "text-rose-700 dark:text-rose-400",
    icon: XCircle,
  },
  WITHDRAWN: {
    label: "Withdrawn",
    bg: "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60",
    text: "text-slate-500 dark:text-slate-400",
    icon: XCircle,
  },
};

export const ROUND_TYPE_LABELS: Record<string, string> = {
  APTITUDE_TEST: "Aptitude Test",
  GROUP_DISCUSSION: "Group Discussion",
  TECHNICAL_INTERVIEW: "Technical Interview",
  HR_INTERVIEW: "HR Interview",
  FINAL: "Final Round / Offer Selection",
};
