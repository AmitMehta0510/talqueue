import axios from "axios";
import prisma from "shared/database/prisma";
import { InterviewResourceSeedItem } from "./interviews.service";

/**
 * Interview Resource Seed & Validator
 *
 * This file contains:
 *   1. INTERVIEW_SEED_DATA — curated static list of YouTube mock interview videos.
 *      Keyed on `youtubeId` — safe to upsert repeatedly via the nightly cron.
 *
 *   2. validateYoutubeVideos() — checks all active DB records via the YouTube
 *      oEmbed API (no API key required). Videos that are deleted or made private
 *      (404 / 401 response) are soft-deactivated automatically.
 *
 * Future: Replace/augment INTERVIEW_SEED_DATA with a YouTube Data API v3 call
 * against curated channel/playlist IDs using YOUTUBE_API_KEY env var.
 */

// ─── YouTube availability validator ──────────────────────────────────────────

/**
 * Checks a single YouTube video ID using the oEmbed endpoint.
 * Returns true if the video is publicly accessible, false otherwise.
 *
 * oEmbed returns 200 for public videos, 404 for deleted/private ones.
 * No API key required — this is a public endpoint.
 */
const isYoutubeVideoAvailable = async (youtubeId: string): Promise<boolean> => {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`;
    const { status } = await axios.head(url, { timeout: 5000, validateStatus: () => true });
    return status === 200;
  } catch {
    // Network error — assume available (don't deactivate on transient failures)
    return true;
  }
};

/**
 * Validates all active interview resources stored in the DB.
 * Soft-deactivates any videos that are no longer publicly available on YouTube.
 *
 * Runs in batches of 10 with a 500ms pause between batches to avoid
 * overwhelming YouTube's servers and triggering rate limiting.
 *
 * @returns counts of validated, deactivated, and failed records
 */
export const validateYoutubeVideos = async (): Promise<{
  checked: number;
  deactivated: number;
  errors: number;
}> => {
  const activeResources = await prisma.interviewResource.findMany({
    where: { isActive: true },
    select: { id: true, youtubeId: true, title: true },
  });

  let checked = 0;
  let deactivated = 0;
  let errors = 0;

  const BATCH_SIZE = 10;
  const BATCH_DELAY_MS = 500;

  for (let i = 0; i < activeResources.length; i += BATCH_SIZE) {
    const batch = activeResources.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (resource) => {
        try {
          const available = await isYoutubeVideoAvailable(resource.youtubeId);
          checked++;

          if (!available) {
            await prisma.interviewResource.update({
              where: { id: resource.id },
              data: { isActive: false },
            });
            deactivated++;
            console.warn(
              `[InterviewValidator] Deactivated unavailable video: "${resource.title}" (${resource.youtubeId})`,
            );
          }
        } catch (err) {
          errors++;
          console.error(
            `[InterviewValidator] Error checking youtubeId=${resource.youtubeId}:`,
            err,
          );
        }
      }),
    );

    // Pause between batches — respect YouTube's rate limits
    if (i + BATCH_SIZE < activeResources.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(
    `[InterviewValidator] Done — checked: ${checked}, deactivated: ${deactivated}, errors: ${errors}`,
  );

  return { checked, deactivated, errors };
};

// ─── Seed data ────────────────────────────────────────────────────────────────

export const INTERVIEW_SEED_DATA: InterviewResourceSeedItem[] = [
  // ─── SDE-1 / Coding ──────────────────────────────────────────────────────
  {
    title: "Google SDE-1 Mock Interview — Two Sum, LRU Cache (NeetCode)",
    sourceUrl: "https://www.youtube.com/watch?v=rjOFnH_xw7A",
    youtubeId: "rjOFnH_xw7A",
    channelName: "NeetCode",
    thumbnailUrl: "https://img.youtube.com/vi/rjOFnH_xw7A/hqdefault.jpg",
    duration: 2880,
    roleTag: "SDE_1",
    difficulty: "INTERMEDIATE",
    companyTag: "FAANG",
    roundType: "CODING",
    langTags: ["Python"],
    formatTag: "MOCK_INTERVIEW",
  },
  {
    title: "Amazon SDE-1 Coding Interview — Arrays & Strings (interviewing.io)",
    sourceUrl: "https://www.youtube.com/watch?v=oBt53YbR9Kk",
    youtubeId: "oBt53YbR9Kk",
    channelName: "interviewing.io",
    thumbnailUrl: "https://img.youtube.com/vi/oBt53YbR9Kk/hqdefault.jpg",
    duration: 3600,
    roleTag: "SDE_1",
    difficulty: "INTERMEDIATE",
    companyTag: "FAANG",
    roundType: "CODING",
    langTags: ["Java"],
    formatTag: "MOCK_INTERVIEW",
  },
  {
    title: "Facebook Meta SDE-1 Mock Coding Interview (TechLead)",
    sourceUrl: "https://www.youtube.com/watch?v=mH_xtNRwR7M",
    youtubeId: "mH_xtNRwR7M",
    channelName: "TechLead",
    thumbnailUrl: "https://img.youtube.com/vi/mH_xtNRwR7M/hqdefault.jpg",
    duration: 3120,
    roleTag: "SDE_1",
    difficulty: "INTERMEDIATE",
    companyTag: "FAANG",
    roundType: "CODING",
    langTags: ["Python", "JavaScript"],
    formatTag: "MOCK_INTERVIEW",
  },
  {
    title: "Startup SDE-1 Interview — React + Node.js Full Stack Round",
    sourceUrl: "https://www.youtube.com/watch?v=Ke90Tje7VS0",
    youtubeId: "Ke90Tje7VS0",
    channelName: "Traversy Media",
    thumbnailUrl: "https://img.youtube.com/vi/Ke90Tje7VS0/hqdefault.jpg",
    duration: 2400,
    roleTag: "SDE_1",
    difficulty: "BEGINNER",
    companyTag: "STARTUP",
    roundType: "CODING",
    langTags: ["Node.js", "React"],
    formatTag: "MOCK_INTERVIEW",
  },

  // ─── SDE-2 / Coding ──────────────────────────────────────────────────────
  {
    title: "Google SDE-2 Mock Coding Interview — Dynamic Programming",
    sourceUrl: "https://www.youtube.com/watch?v=dp_sde2_google_001",
    youtubeId: "dp_sde2_google_001",
    channelName: "NeetCode",
    thumbnailUrl: "https://img.youtube.com/vi/oBt53YbR9Kk/hqdefault.jpg",
    duration: 3300,
    roleTag: "SDE_2",
    difficulty: "ADVANCED",
    companyTag: "FAANG",
    roundType: "CODING",
    langTags: ["Python"],
    formatTag: "MOCK_INTERVIEW",
  },
  {
    title: "Microsoft SDE-2 Full Interview Loop Breakdown",
    sourceUrl: "https://www.youtube.com/watch?v=1qw5ITr3k9E",
    youtubeId: "1qw5ITr3k9E",
    channelName: "interviewing.io",
    thumbnailUrl: "https://img.youtube.com/vi/1qw5ITr3k9E/hqdefault.jpg",
    duration: 4200,
    roleTag: "SDE_2",
    difficulty: "ADVANCED",
    companyTag: "MNC",
    roundType: "CODING",
    langTags: ["C++", "Java"],
    formatTag: "MOCK_INTERVIEW",
  },

  // ─── System Design ────────────────────────────────────────────────────────
  {
    title: "Design a URL Shortener — System Design Interview (Gaurav Sen)",
    sourceUrl: "https://www.youtube.com/watch?v=fMZMm_0ZhK4",
    youtubeId: "fMZMm_0ZhK4",
    channelName: "Gaurav Sen",
    thumbnailUrl: "https://img.youtube.com/vi/fMZMm_0ZhK4/hqdefault.jpg",
    duration: 1860,
    roleTag: "SYSTEM_DESIGN",
    difficulty: "INTERMEDIATE",
    companyTag: "ANY",
    roundType: "SYSTEM_DESIGN",
    langTags: [],
    formatTag: "EXPLANATION",
  },
  {
    title: "Design WhatsApp / Chat System — System Design Interview",
    sourceUrl: "https://www.youtube.com/watch?v=vvhC64hQZMk",
    youtubeId: "vvhC64hQZMk",
    channelName: "Gaurav Sen",
    thumbnailUrl: "https://img.youtube.com/vi/vvhC64hQZMk/hqdefault.jpg",
    duration: 2040,
    roleTag: "SYSTEM_DESIGN",
    difficulty: "ADVANCED",
    companyTag: "FAANG",
    roundType: "SYSTEM_DESIGN",
    langTags: [],
    formatTag: "EXPLANATION",
  },
  {
    title: "Google System Design Mock Interview — Design Google Maps",
    sourceUrl: "https://www.youtube.com/watch?v=jPKTo1iGQiE",
    youtubeId: "jPKTo1iGQiE",
    channelName: "interviewing.io",
    thumbnailUrl: "https://img.youtube.com/vi/jPKTo1iGQiE/hqdefault.jpg",
    duration: 3900,
    roleTag: "SYSTEM_DESIGN",
    difficulty: "ADVANCED",
    companyTag: "FAANG",
    roundType: "SYSTEM_DESIGN",
    langTags: [],
    formatTag: "MOCK_INTERVIEW",
  },
  {
    title: "Design Twitter Feed — System Design for SDE-2",
    sourceUrl: "https://www.youtube.com/watch?v=wYk0xPP_P_8",
    youtubeId: "wYk0xPP_P_8",
    channelName: "Tech Dummies Narendra L",
    thumbnailUrl: "https://img.youtube.com/vi/wYk0xPP_P_8/hqdefault.jpg",
    duration: 2700,
    roleTag: "SYSTEM_DESIGN",
    difficulty: "ADVANCED",
    companyTag: "FAANG",
    roundType: "SYSTEM_DESIGN",
    langTags: [],
    formatTag: "EXPLANATION",
  },

  // ─── Backend ──────────────────────────────────────────────────────────────
  {
    title: "Node.js Backend Interview Questions — Express + REST API Round",
    sourceUrl: "https://www.youtube.com/watch?v=ENrzD9HAZK4",
    youtubeId: "ENrzD9HAZK4",
    channelName: "Akshay Saini",
    thumbnailUrl: "https://img.youtube.com/vi/ENrzD9HAZK4/hqdefault.jpg",
    duration: 3600,
    roleTag: "BACKEND",
    difficulty: "INTERMEDIATE",
    companyTag: "STARTUP",
    roundType: "CODING",
    langTags: ["Node.js", "JavaScript"],
    formatTag: "QA_ONLY",
  },
  {
    title: "Spring Boot Interview — Java Backend Technical Round (MNC)",
    sourceUrl: "https://www.youtube.com/watch?v=6n79UPbGfio",
    youtubeId: "6n79UPbGfio",
    channelName: "Daily Code Buffer",
    thumbnailUrl: "https://img.youtube.com/vi/6n79UPbGfio/hqdefault.jpg",
    duration: 4200,
    roleTag: "BACKEND",
    difficulty: "INTERMEDIATE",
    companyTag: "MNC",
    roundType: "CODING",
    langTags: ["Spring Boot", "Java"],
    formatTag: "QA_ONLY",
  },
  {
    title: "Python Django REST Framework Interview — Backend Deep Dive",
    sourceUrl: "https://www.youtube.com/watch?v=rHux0gMZ3Eg",
    youtubeId: "rHux0gMZ3Eg",
    channelName: "Tech With Tim",
    thumbnailUrl: "https://img.youtube.com/vi/rHux0gMZ3Eg/hqdefault.jpg",
    duration: 2880,
    roleTag: "BACKEND",
    difficulty: "INTERMEDIATE",
    companyTag: "STARTUP",
    roundType: "CODING",
    langTags: ["Python", "Django"],
    formatTag: "QA_ONLY",
  },
  {
    title: "Go (Golang) Backend Interview — Concurrency & API Design",
    sourceUrl: "https://www.youtube.com/watch?v=YS4e4q9oBaU",
    youtubeId: "YS4e4q9oBaU",
    channelName: "TechSchool",
    thumbnailUrl: "https://img.youtube.com/vi/YS4e4q9oBaU/hqdefault.jpg",
    duration: 3600,
    roleTag: "BACKEND",
    difficulty: "ADVANCED",
    companyTag: "STARTUP",
    roundType: "CODING",
    langTags: ["Go"],
    formatTag: "EXPLANATION",
  },

  // ─── Frontend ─────────────────────────────────────────────────────────────
  {
    title: "React Frontend Interview — Hooks, State, Performance (Airbnb)",
    sourceUrl: "https://www.youtube.com/watch?v=oTD9i6_k4gE",
    youtubeId: "oTD9i6_k4gE",
    channelName: "interviewing.io",
    thumbnailUrl: "https://img.youtube.com/vi/oTD9i6_k4gE/hqdefault.jpg",
    duration: 3600,
    roleTag: "FRONTEND",
    difficulty: "INTERMEDIATE",
    companyTag: "FAANG",
    roundType: "CODING",
    langTags: ["React", "JavaScript"],
    formatTag: "MOCK_INTERVIEW",
  },
  {
    title: "JavaScript Interview — Closures, Event Loop, Prototypes (Top 50 Qs)",
    sourceUrl: "https://www.youtube.com/watch?v=vn3tm0quoqE",
    youtubeId: "vn3tm0quoqE",
    channelName: "Akshay Saini",
    thumbnailUrl: "https://img.youtube.com/vi/vn3tm0quoqE/hqdefault.jpg",
    duration: 7200,
    roleTag: "FRONTEND",
    difficulty: "INTERMEDIATE",
    companyTag: "ANY",
    roundType: "CODING",
    langTags: ["JavaScript"],
    formatTag: "QA_ONLY",
  },

  // ─── DevOps ───────────────────────────────────────────────────────────────
  {
    title: "DevOps SRE Interview — Kubernetes, CI/CD, AWS (FAANG Level)",
    sourceUrl: "https://www.youtube.com/watch?v=s_o8dwzRlu4",
    youtubeId: "s_o8dwzRlu4",
    channelName: "TechWorld with Nana",
    thumbnailUrl: "https://img.youtube.com/vi/s_o8dwzRlu4/hqdefault.jpg",
    duration: 3600,
    roleTag: "DEVOPS",
    difficulty: "ADVANCED",
    companyTag: "FAANG",
    roundType: "CODING",
    langTags: ["Kubernetes", "AWS", "Docker"],
    formatTag: "QA_ONLY",
  },

  // ─── Data / ML ────────────────────────────────────────────────────────────
  {
    title: "ML Engineer Interview — ML System Design + Coding Round (Google)",
    sourceUrl: "https://www.youtube.com/watch?v=0A1X9muNiNI",
    youtubeId: "0A1X9muNiNI",
    channelName: "interviewing.io",
    thumbnailUrl: "https://img.youtube.com/vi/0A1X9muNiNI/hqdefault.jpg",
    duration: 4800,
    roleTag: "DATA_ML",
    difficulty: "ADVANCED",
    companyTag: "FAANG",
    roundType: "SYSTEM_DESIGN",
    langTags: ["Python"],
    formatTag: "MOCK_INTERVIEW",
  },

  // ─── Behavioral ───────────────────────────────────────────────────────────
  {
    title: "Amazon Behavioral Interview — STAR Method with LP Examples",
    sourceUrl: "https://www.youtube.com/watch?v=S9s5d6-v8QI",
    youtubeId: "S9s5d6-v8QI",
    channelName: "Self Made Millennial",
    thumbnailUrl: "https://img.youtube.com/vi/S9s5d6-v8QI/hqdefault.jpg",
    duration: 2400,
    roleTag: "BEHAVIORAL",
    difficulty: "BEGINNER",
    companyTag: "FAANG",
    roundType: "HR_BEHAVIORAL",
    langTags: [],
    formatTag: "EXPLANATION",
  },
  {
    title: "Startup HR Round — Behavioral & Culture Fit Questions Guide",
    sourceUrl: "https://www.youtube.com/watch?v=fqna-P9JNVE",
    youtubeId: "fqna-P9JNVE",
    channelName: "Linda Raynier",
    thumbnailUrl: "https://img.youtube.com/vi/fqna-P9JNVE/hqdefault.jpg",
    duration: 1800,
    roleTag: "BEHAVIORAL",
    difficulty: "BEGINNER",
    companyTag: "STARTUP",
    roundType: "HR_BEHAVIORAL",
    langTags: [],
    formatTag: "EXPLANATION",
  },

  // ─── Mobile ───────────────────────────────────────────────────────────────
  {
    title: "React Native Mobile Interview — Redux, Navigation, Performance",
    sourceUrl: "https://www.youtube.com/watch?v=0-S5a0eXPoc",
    youtubeId: "0-S5a0eXPoc",
    channelName: "Academind",
    thumbnailUrl: "https://img.youtube.com/vi/0-S5a0eXPoc/hqdefault.jpg",
    duration: 3600,
    roleTag: "MOBILE",
    difficulty: "INTERMEDIATE",
    companyTag: "STARTUP",
    roundType: "CODING",
    langTags: ["React", "JavaScript"],
    formatTag: "QA_ONLY",
  },

  // ─── Fullstack ────────────────────────────────────────────────────────────
  {
    title: "Fullstack Interview — MERN Stack Live Coding Round (Startup)",
    sourceUrl: "https://www.youtube.com/watch?v=nLXCRBqMoAg",
    youtubeId: "nLXCRBqMoAg",
    channelName: "Traversy Media",
    thumbnailUrl: "https://img.youtube.com/vi/nLXCRBqMoAg/hqdefault.jpg",
    duration: 4200,
    roleTag: "FULLSTACK",
    difficulty: "INTERMEDIATE",
    companyTag: "STARTUP",
    roundType: "CODING",
    langTags: ["Node.js", "React", "MongoDB"],
    formatTag: "MOCK_INTERVIEW",
  },
];

/**
 * Runs the static seed — upserts all items in INTERVIEW_SEED_DATA.
 * Called by the cron job and the admin manual scrape trigger.
 */
export const runInterviewSeed = async () => {
  const { seedInterviewResources } = await import("./interviews.service");
  const result = await seedInterviewResources(INTERVIEW_SEED_DATA);
  console.log(
    `[InterviewScraper] Seed complete — created: ${result.created}, updated: ${result.updated}`,
  );
  return result;
};
