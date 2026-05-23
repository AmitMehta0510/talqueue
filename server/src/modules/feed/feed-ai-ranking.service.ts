import { FeedContext, getCreatorId, RankedFeedItem } from "./feed-ranking.service";
import { FEED_SCORE_WEIGHTS } from "./feed-score-config.service";

export const applyAiFeedRanking = async (
  feed: RankedFeedItem[],

  context: FeedContext,
) => {
  const skillNameSet =
    context.skillNameSet ||
    new Set(context.skillNames.map((skill) => skill.toLowerCase()));

  // AI RE-RANKING
  const rankedFeed = feed.map((item) => {
    let score = item.score;

    // AUTHOR AFFINITY BOOST

    const authorId = getCreatorId(item.data);

    if (authorId && context.affinityMap.has(authorId)) {
      score +=
        (context.affinityMap.get(authorId) || 0) *
        FEED_SCORE_WEIGHTS.aiReranking.affinityMultiplier;
    }

    // INTERACTION MEMORY BOOST
    const interactionKey = `${item.type}:${item.data.id}`;

    const interactionScore = context.interactionMap.get(interactionKey) || 0;

    score += interactionScore * FEED_SCORE_WEIGHTS.aiReranking.interaction;

    // SKILL VECTOR BOOST
    if (skillNameSet.size) {
      // POSTS
      if (item.type === "POST") {
        const content = item.data.content?.toLowerCase() || "";

        for (const skill of skillNameSet) {
          if (
            typeof skill === "string" &&
            content.includes(skill)
          ) {
            score += FEED_SCORE_WEIGHTS.aiReranking.postSkillMatch;
          }
        }
      }

      // PROJECTS
      if (item.type === "PROJECT") {
        const techStack = Array.isArray(item.data.techStack)
          ? item.data.techStack
          : [];

        const overlap = techStack.filter(
          (tech: any) =>
            typeof tech === "string" &&
            skillNameSet.has(tech.toLowerCase()),
        );

        score +=
          overlap.length * FEED_SCORE_WEIGHTS.aiReranking.projectSkillMatch;
      }

      // JOBS
      if (item.type === "JOB") {
        const skillsRequired = Array.isArray(item.data.skillsRequired)
          ? item.data.skillsRequired
          : [];

        const overlap = skillsRequired.filter((skill: string) =>
          skillNameSet.has(skill.toLowerCase()),
        );

        score += overlap.length * FEED_SCORE_WEIGHTS.aiReranking.jobSkillMatch;
      }
    }

    // HIGH QUALITY CREATOR BOOST
    const creatorEngineeringScore =
      item.data.author?.engineeringScore ||
      item.data.owner?.engineeringScore ||
      item.data.createdBy?.engineeringScore ||
      0;

    score +=
      creatorEngineeringScore * FEED_SCORE_WEIGHTS.aiReranking.creatorEngineering;

    // DIVERSITY PENALTY
    if (item.type === "COMPANY") {
      score -= FEED_SCORE_WEIGHTS.aiReranking.companyDiversityPenalty;
    }

    // ELITE ENGINEERS BOOST
    const creatorTrustLevel =
      item.data.author?.trustLevel ||
      item.data.owner?.trustLevel ||
      item.data.createdBy?.trustLevel;

    if (creatorTrustLevel === "ELITE") {
      score += FEED_SCORE_WEIGHTS.aiReranking.eliteCreator;
    }

    if (creatorTrustLevel === "ADVANCED") {
      score += FEED_SCORE_WEIGHTS.aiReranking.advancedCreator;
    }

    return {
      ...item,
      aiScore: Math.round(score),
    };
  });

  // FINAL AI SORT
  rankedFeed.sort((a, b) => b.aiScore - a.aiScore);

  return rankedFeed;
};
