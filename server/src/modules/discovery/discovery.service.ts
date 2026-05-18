import { generateFeedCandidates } from "./candidate-generator.service";

import { applyFeedDiversity } from "./feed-diversity.service";

import { applySmartReranking } from "./discovery-ranking.service";

import { calculateFeedScore } from "modules/feed/feed-ranking.service";

import { buildFeedContext } from "./feed-context.service";

import { getRecommendationMemoryMap } from "./recommendation-memory.service";

import prisma from "shared/database/prisma";

export const getDiscoveryFeed = async (userId: string) => {
  //create context
  const context = await buildFeedContext(userId);

  // Candidates
  const candidates = await generateFeedCandidates(userId);

  // Memory Map
  const memoryMap = await getRecommendationMemoryMap(userId);

  // Unified feed
  const feed = [
    ...(await Promise.all(
      candidates.posts.map(async (post) => {
        let score = calculateFeedScore(post, "POST", context);

        const memory = memoryMap.get(`POST:${post.id}`);

        if (memory) {
          score += memory.clicked * 12;

          score -= memory.ignored * 8;
        }
        return {
          type: "POST",

          score,

          reason: "Trending among engineers",

          data: post,
        };
      }),
    )),

    ...(await Promise.all(
      candidates.projects.map(async (project) => {
        let score = calculateFeedScore(project, "PROJECT", context);

        const memory = memoryMap.get(`PROJECT:${project.id}`);

        if (memory) {
          score += memory.clicked * 12;

          score -= memory.ignored * 8;
        }
        return {
          type: "PROJECT",

          score,

          reason: "Trending among engineers",

          data: project,
        };
      }),
    )),

    ...(await Promise.all(
      candidates.jobs.map(async (job) => {
        let score = calculateFeedScore(job, "JOB", context);

        const memory = memoryMap.get(`JOB:${job.id}`);

        if (memory) {
          score += memory.clicked * 12;
          score -= memory.ignored * 8;
        }
        return {
          type: "JOB",

          score,

          reason: "Trending among engineers",

          data: job,
        };
      }),
    )),

    ...(await Promise.all(
      candidates.hackathons.map(async (hackathon) => {
        let score = calculateFeedScore(hackathon, "HACKATHON", context);

        const memory = memoryMap.get(`HACKATHON:${hackathon.id}`);

        if (memory) {
          score += memory.clicked * 12;
          score -= memory.ignored * 8;
        }
        return {
          type: "HACKATHON",

          score,

          reason: "Trending among engineers",

          data: hackathon,
        };
      }),
    )),
  ];

  // Ranking
  const ranked = await applySmartReranking(userId, feed);

  // Diversity
  const diversified = await applyFeedDiversity(ranked);

  return diversified.slice(0, 60);
};
