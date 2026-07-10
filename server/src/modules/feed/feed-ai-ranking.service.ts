import { FeedContext, getCreatorId, RankedFeedItem, getSkillRegex } from "./feed-ranking.service";
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

    // ── INTEREST PROFILE BOOSTS (from materialized UserInterestProfile) ───────
    // Only applied when the daily aggregation cron has run for this user.
    const ip = (context as any).interestProfile;
    if (ip) {
      // Boost jobs matching user's preferred job types (FULL_TIME, INTERNSHIP, etc.)
      if (item.type === "JOB" && ip.preferredJobTypes?.length) {
        const jobType = (item.data as any).type;
        if (jobType && ip.preferredJobTypes.includes(jobType)) {
          score += 8; // significant boost for job type match
        }
      }

      // Boost content from preferred content types (user is more likely to engage)
      if (ip.preferredContentTypes?.length && ip.preferredContentTypes.includes(item.type)) {
        score += 4;
      }

      // Boost job items for users with high recruiter interest
      if (item.type === "JOB" && ip.recruiterInterestScore > 0.5) {
        score += ip.recruiterInterestScore * 6;
      }

      // Boost projects for users with high open-source affinity
      if (item.type === "PROJECT" && ip.openSourceAffinity > 0.5) {
        score += ip.openSourceAffinity * 5;
      }

      // Boost hackathons for users with high collaboration affinity
      if (item.type === "HACKATHON" && ip.collaborationAffinity > 0.5) {
        score += ip.collaborationAffinity * 5;
      }
    }
    // ── END INTEREST PROFILE BOOSTS ──────────────────────────────────────────

    // SKILL VECTOR BOOST
    if (skillNameSet.size) {
      // POSTS
      if (item.type === "POST") {
        const content = item.data.content?.toLowerCase() || "";
        if (content) {
          const regex = getSkillRegex(context);
          if (regex) {
            regex.lastIndex = 0;
            const matches = content.match(regex);
            if (matches) {
              const uniqueMatches = new Set(matches);
              score += uniqueMatches.size * FEED_SCORE_WEIGHTS.aiReranking.postSkillMatch;
            }
          }
        }
      }
      // PROJECTS
      else if (item.type === "PROJECT") {
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
      else if (item.type === "JOB") {
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
    } else if (creatorTrustLevel === "ADVANCED") {
      score += FEED_SCORE_WEIGHTS.aiReranking.advancedCreator;
    }

    return {
      ...item,
      aiScore: Math.round(score),
    };
  });

  return interleaveFeed(rankedFeed, context.userRole, context.isFresher);
};

const classifyItem = (
  item: RankedFeedItem,
  userRole: string | null | undefined,
  isFresher: boolean,
): number => {
  const type = item.type;
  const data = item.data;
  const content = (data.content || "").toLowerCase();
  const authorRole =
    data.author?.primaryRole ||
    data.owner?.primaryRole ||
    data.createdBy?.primaryRole ||
    "";
  const authorReputation =
    data.author?.reputationScore ||
    data.owner?.reputationScore ||
    data.createdBy?.reputationScore ||
    0;
  const authorEngineering =
    data.author?.engineeringScore ||
    data.owner?.engineeringScore ||
    data.createdBy?.engineeringScore ||
    0;

  const role = userRole ? userRole.toUpperCase() : "";

  if (role === "STUDENT" || role === "FRESHER" || isFresher) {
    if (type === "JOB") return 0; // Stream 1: Active Jobs/Internships (40%)
    if (type === "HACKATHON") return 1; // Stream 2: Current Hackathons (10%)
    if (type === "PROJECT") return 2; // Stream 3: Skill-Matched Projects (20%)
    return 3; // Stream 4: Community Posts/Suggestions (30%)
  }

  if (role === "RECRUITER") {
    // Stream 1: TPO/College Admin Posts (40%)
    if (
      type === "POST" &&
      (authorRole === "COLLEGE_ADMIN" ||
        authorRole === "TPO" ||
        authorRole === "CDCR")
    ) {
      return 0;
    }
    // Stream 2: High-Reputation Student Projects (30%)
    if (
      type === "PROJECT" &&
      (authorRole === "STUDENT" || authorRole === "") &&
      (authorReputation >= 100 || authorEngineering >= 80)
    ) {
      return 1;
    }
    // Stream 3: B2B Recruitment Threads (20%)
    if (
      type === "POST" &&
      (data.type === "JOB" ||
        content.includes("hire") ||
        content.includes("hiring") ||
        content.includes("recruit") ||
        content.includes("recruitment") ||
        content.includes("b2b") ||
        content.includes("job") ||
        content.includes("career"))
    ) {
      return 2;
    }
    // Stream 4: Network Suggestions (10%)
    return 3;
  }

  if (role === "COLLEGE_ADMIN" || role === "TPO" || role === "CDCR") {
    // Stream 1: Recruiter Branding Updates (40%)
    if (type === "POST" && authorRole === "RECRUITER") {
      return 0;
    }
    // Stream 2: Direct HR Connection Widgets (30%)
    if (type === "COMPANY" || (type === "POST" && content.includes("hr"))) {
      return 1;
    }
    // Stream 3: Active Jobs/Internships (with Share Intents Enabled) (20%)
    if (type === "JOB") {
      return 2;
    }
    // Stream 4: Internal Department Student Posts (10%)
    if (
      type === "POST" &&
      (data.type === "DEPARTMENT" || authorRole === "STUDENT")
    ) {
      return 3;
    }
    return 3;
  }

  if (
    role === "PROFESSIONAL" ||
    role === "WORKING_PROFESSIONAL" ||
    role === "MENTOR"
  ) {
    // Stream 1: System Design Discussions (40%)
    if (
      type === "POST" &&
      (content.includes("system design") ||
        content.includes("architecture") ||
        content.includes("scalability") ||
        content.includes("microservices") ||
        content.includes("database") ||
        content.includes("design pattern"))
    ) {
      return 0;
    }
    // Stream 2: Trending Repositories (30%)
    if (type === "PROJECT") {
      return 1;
    }
    // Stream 3: Referral Requests (20%)
    if (
      type === "POST" &&
      (content.includes("referral") ||
        content.includes("refer") ||
        content.includes("looking for referral"))
    ) {
      return 2;
    }
    // Stream 4: Connections (10%)
    return 3;
  }

  return -1;
};

const interleaveFeed = (
  items: (RankedFeedItem & { aiScore: number })[],
  userRole: string | null | undefined,
  isFresher: boolean,
  limit = 60,
): (RankedFeedItem & { aiScore: number })[] => {
  const role = userRole ? userRole.toUpperCase() : "";

  let ratio: number[];
  if (role === "STUDENT" || role === "FRESHER" || isFresher) {
    ratio = [4, 1, 2, 3];
  } else if (role === "RECRUITER") {
    ratio = [4, 3, 2, 1];
  } else if (role === "COLLEGE_ADMIN" || role === "TPO" || role === "CDCR") {
    ratio = [4, 3, 2, 1];
  } else if (
    role === "PROFESSIONAL" ||
    role === "WORKING_PROFESSIONAL" ||
    role === "MENTOR"
  ) {
    ratio = [4, 3, 2, 1];
  } else {
    return items.sort((a, b) => b.aiScore - a.aiScore);
  }

  const streams: (RankedFeedItem & { aiScore: number })[][] = [[], [], [], []];
  for (const item of items) {
    const streamIdx = classifyItem(item, userRole, isFresher);
    if (streamIdx >= 0 && streamIdx < 4) {
      streams[streamIdx].push(item);
    } else {
      streams[3].push(item);
    }
  }

  for (let s = 0; s < 4; s++) {
    streams[s].sort((a, b) => b.aiScore - a.aiScore);
  }

  const result: (RankedFeedItem & { aiScore: number })[] = [];
  const pointers = [0, 0, 0, 0];

  while (result.length < limit && result.length < items.length) {
    let addedInThisCycle = false;

    for (let s = 0; s < 4; s++) {
      const takeCount = ratio[s];
      for (let j = 0; j < takeCount; j++) {
        if (result.length >= limit) break;
        if (pointers[s] < streams[s].length) {
          result.push(streams[s][pointers[s]]);
          pointers[s]++;
          addedInThisCycle = true;
        }
      }
    }

    if (!addedInThisCycle) {
      const remaining: (RankedFeedItem & { aiScore: number })[] = [];
      for (let s = 0; s < 4; s++) {
        while (pointers[s] < streams[s].length) {
          remaining.push(streams[s][pointers[s]]);
          pointers[s]++;
        }
      }
      remaining.sort((a, b) => b.aiScore - a.aiScore);
      for (const item of remaining) {
        if (result.length >= limit) break;
        result.push(item);
      }
      break;
    }
  }

  return result;
};
