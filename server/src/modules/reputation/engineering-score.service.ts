import prisma from "shared/database/prisma";
import { determineTrustLevel } from "../engineering/engineering-trust.service";

/** Centralised score weights — change here to adjust ranking across the platform. */
const SCORE_WEIGHTS = {
  PROJECT: {
    VERIFIED:          25,
    COMPLETED:         20,
    LIVE_DEPLOYMENT:   15,
    STARS_PER:        0.5, MAX_STARS:         20,
    FORKS_PER:        0.3, MAX_FORKS:         10,
    CONTRIBUTORS_PER:   2, MAX_CONTRIBUTORS:  20,
    COMMITS_PER:     0.05, MAX_COMMITS:       25,
    FEATURED:          15,
    RECENT_ACTIVITY:   10,  // committed in last 30 days
  },
  EXPERIENCE: {
    VERIFIED:          20,
    WORK_EMAIL:        15,
    ENGINEERING_ROLE:  10,
    MONTHS_PER:       0.8, MAX_DURATION:      20,
    TECH_STACK:         5,
    SKILLS_USED:        5,
    SUSPICIOUS_PENALTY:-25,
    CAP_PER:           60,
  },
  HACKATHON: {
    VERIFIED_WIN:      40,
    UNVERIFIED_WIN:    10,
  },
  SUBMISSION_SCORE_FACTOR: 0.5,
  SUBMISSION_VERIFIED_PROJECT: 10,
  GLOBAL_CAP: 10_000,
} as const;

// ─── Developer Level System ─────────────────────────────────────────────────

export interface EngineerLevel {
  /** Ordinal rank (1 = lowest) */
  rank: number;
  /** Display label for the level */
  label: string;
  /** Minimum score required to reach this level */
  minScore: number;
  /** Score threshold for the next level (null if max) */
  nextLevelScore: number | null;
  /** Progress towards the next level, 0–100% */
  progress: number;
  /** Emoji badge icon */
  badge: string;
}

const LEVELS = [
  { rank: 1, label: "Newbie",             minScore: 0,     badge: "🌱" },
  { rank: 2, label: "Apprentice",         minScore: 100,   badge: "⚡" },
  { rank: 3, label: "Associate Engineer", minScore: 500,   badge: "🔧" },
  { rank: 4, label: "Software Engineer",  minScore: 1_500, badge: "💻" },
  { rank: 5, label: "Senior Engineer",    minScore: 3_000, badge: "🚀" },
  { rank: 6, label: "Staff Engineer",     minScore: 5_000, badge: "🏗️" },
  { rank: 7, label: "Principal Engineer", minScore: 7_500, badge: "🎯" },
  { rank: 8, label: "Kernel Architect",   minScore: 9_500, badge: "🏆" },
] as const;

/**
 * Maps a raw engineering score to a named developer level with progress info.
 * Useful for profile badges, leaderboards, and gamification nudges.
 */
export const getEngineerLevel = (score: number): EngineerLevel => {
  type LevelEntry = { rank: number; label: string; minScore: number; badge: string };
  let currentLevel: LevelEntry = LEVELS[0];
  for (const level of LEVELS) {
    if (score >= level.minScore) currentLevel = level;
    else break;
  }

  const currentIndex = LEVELS.findIndex((l) => l.rank === currentLevel.rank);
  const nextLevel: LevelEntry | undefined = LEVELS[currentIndex + 1];
  const nextLevelScore: number | null = nextLevel?.minScore ?? null;

  const progress = nextLevelScore
    ? Math.min(
        Math.round(
          ((score - currentLevel.minScore) /
            (nextLevelScore - currentLevel.minScore)) *
            100,
        ),
        100,
      )
    : 100; // Already at max level

  return {
    rank: currentLevel.rank,
    label: currentLevel.label,
    badge: currentLevel.badge,
    minScore: currentLevel.minScore,
    nextLevelScore,
    progress,
  };
};

export const calculateEngineeringScore = async (
    userId: string,
    options: { persist?: boolean } = { persist: true },
  ) => {

    // Concurrently fetch User scores, Projects, Experiences, Hackathons & Submissions
    const [user, projects, experiences, hackathonWinsList, submissions] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          reputationScore: true,
        },
      }),
      prisma.project.findMany({
        where: {
          members: {
            some: {
              userId,
            },
          },

          deletedAt: null,
        },
      }),
      prisma.experience.findMany({
        where: {
          userId,
        },
      }),
      prisma.hackathonWinner.findMany({
        where: {
          team: {
            members: {
              some: {
                userId,
              },
            },
          },
        },
        select: {
          hackathon: {
            select: {
              verified: true,
            },
          },
        },
      }),
      prisma.hackathonSubmission.findMany({
        where: {
          team: {
            members: {
              some: {
                userId,
              },
            },
          },
        },
      }),
    ]);

    if (!user) {
      return 0;
    }

    // START SCORE
    let score = 0;

    // PROJECT SCORING
    for (const project of projects) {
      // Verified project
      if (project.verified) score += SCORE_WEIGHTS.PROJECT.VERIFIED;

      // Completed project
      if (project.status === "COMPLETED") score += SCORE_WEIGHTS.PROJECT.COMPLETED;

      // Live deployment
      if (project.deploymentStatus === "LIVE") score += SCORE_WEIGHTS.PROJECT.LIVE_DEPLOYMENT;

      // GitHub stars
      score += Math.min(project.starsCount * SCORE_WEIGHTS.PROJECT.STARS_PER, SCORE_WEIGHTS.PROJECT.MAX_STARS);

      // Forks
      score += Math.min(project.forksCount * SCORE_WEIGHTS.PROJECT.FORKS_PER, SCORE_WEIGHTS.PROJECT.MAX_FORKS);

      // Contributors
      score += Math.min(project.contributorsCount * SCORE_WEIGHTS.PROJECT.CONTRIBUTORS_PER, SCORE_WEIGHTS.PROJECT.MAX_CONTRIBUTORS);

      // Commit activity
      score += Math.min(project.commitCount * SCORE_WEIGHTS.PROJECT.COMMITS_PER, SCORE_WEIGHTS.PROJECT.MAX_COMMITS);

      // Featured project
      if (project.featured) score += SCORE_WEIGHTS.PROJECT.FEATURED;

      // Fresh repo activity (updated in last 30 days)
      if (project.repoUpdatedAt) {
        const diffDays = Math.floor((Date.now() - new Date(project.repoUpdatedAt).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) score += SCORE_WEIGHTS.PROJECT.RECENT_ACTIVITY;
      }
    }

    // EXPERIENCE SCORING
    for (const experience of experiences) {
      let experienceScore = 0;

      // Verified experience
      if (experience.verified) experienceScore += SCORE_WEIGHTS.EXPERIENCE.VERIFIED;

      // Work email verified
      if (experience.workEmailVerified) experienceScore += SCORE_WEIGHTS.EXPERIENCE.WORK_EMAIL;

      // Engineering role title check
      const engineeringKeywords = ["engineer", "developer", "backend", "frontend", "full stack", "software", "sde", "devops", "data", "ml", "ai"];
      if (engineeringKeywords.some((kw) => experience.title.toLowerCase().includes(kw))) {
        experienceScore += SCORE_WEIGHTS.EXPERIENCE.ENGINEERING_ROLE;
      }

      // Duration scoring — ignore suspiciously short stints (< 3 months)
      const endDate = experience.endDate || new Date();
      const months = (endDate.getTime() - experience.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (months >= 3) {
        experienceScore += Math.min(months * SCORE_WEIGHTS.EXPERIENCE.MONTHS_PER, SCORE_WEIGHTS.EXPERIENCE.MAX_DURATION);
      }

      // Tech stack listed
      if (experience.techStack && Array.isArray(experience.techStack)) {
        experienceScore += SCORE_WEIGHTS.EXPERIENCE.TECH_STACK;
      }

      // Skills used listed
      if (experience.skillsUsed && Array.isArray(experience.skillsUsed)) {
        experienceScore += SCORE_WEIGHTS.EXPERIENCE.SKILLS_USED;
      }

      // Suspicious flag penalty
      if (experience.suspicious) experienceScore += SCORE_WEIGHTS.EXPERIENCE.SUSPICIOUS_PENALTY;

      // Cap per experience entry
      experienceScore = Math.min(experienceScore, SCORE_WEIGHTS.EXPERIENCE.CAP_PER);

      score += experienceScore;
    }

    // Hackathon wins — verified wins: 40 pts each, unverified: 10 pts each
    const hackathonWinsCount = hackathonWinsList.length;
    const verifiedHackathonWinsCount = hackathonWinsList.filter(
      (win) => win.hackathon?.verified,
    ).length;
    const unverifiedWinsCount = hackathonWinsCount - verifiedHackathonWinsCount;
    score += verifiedHackathonWinsCount * SCORE_WEIGHTS.HACKATHON.VERIFIED_WIN;
    score += unverifiedWinsCount * SCORE_WEIGHTS.HACKATHON.UNVERIFIED_WIN;

    // Submission engineering scores
    for (const submission of submissions) {
      score += (submission.engineeringScore || 0) * SCORE_WEIGHTS.SUBMISSION_SCORE_FACTOR;
      if (submission.verifiedProject) score += SCORE_WEIGHTS.SUBMISSION_VERIFIED_PROJECT;
    }

    // Clamp to global cap
    score = Math.min(Math.round(score), SCORE_WEIGHTS.GLOBAL_CAP);

    // IN-MEMORY COMPILATION: Prep aggregates for single-write Trust update
    const verifiedProjects = projects.filter((p) => p.verified).length;
    const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;
    const verifiedExperiences = experiences.filter((e) => e.verified).length;

    const trustLevel = determineTrustLevel({
      engineeringScore: score,
      reputationScore: user.reputationScore ?? 0,
      verifiedProjects,
      completedProjects,
      verifiedExperiences,
      hackathonWins: hackathonWinsCount,
      verifiedHackathonWins: verifiedHackathonWinsCount,
    });

    // Persist to DB (skip if persist:false — useful for dry-runs and bulk loops)
    if (options.persist !== false) {
      await prisma.user.update({
        where: { id: userId },
        data: { engineeringScore: score, trustLevel },
      });
    }

    return score;
  };