import { buildRankedFeedItems } from "./feed-ranking.service";
import { applyAiFeedRanking } from "./feed-ai-ranking.service";
import { buildFeedContext } from "modules/discovery/feed-context.service";
import { generateFeedCandidates } from "modules/discovery/candidate-generator.service";

export const getPersonalizedFeedV2 = async (userId: string) => {
  const [context, candidates] = await Promise.all([
    buildFeedContext(userId),

    generateFeedCandidates(userId, "personalized"),
  ]);

  // BUILD FEED
  const feed = [
    ...buildRankedFeedItems(candidates.posts, "POST", context),

    ...buildRankedFeedItems(candidates.projects, "PROJECT", context),

    ...buildRankedFeedItems(candidates.hackathons, "HACKATHON", context),

    ...buildRankedFeedItems(candidates.jobs, "JOB", context),

    ...buildRankedFeedItems(candidates.companies, "COMPANY", context),
  ];

  // FINAL SORT
  const rankedFeed = await applyAiFeedRanking(feed, context);

  return rankedFeed.slice(0, 60);
};
