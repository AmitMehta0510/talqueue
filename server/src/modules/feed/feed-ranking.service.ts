import { FEED_SCORE_WEIGHTS } from "./feed-score-config.service";

export type FeedItemType =
  | "POST"
  | "PROJECT"
  | "HACKATHON"
  | "JOB"
  | "COMPANY"
  | "COMMUNITY";

export type FeedContext = {
  followingIds: string[];
  followingIdSet?: Set<string>;
  skillNames: string[];
  skillNameSet?: Set<string>;
  skillRegex?: RegExp;
  isFresher: boolean;
  interactionMap: Map<string, number>;
  affinityMap: Map<string, number>;
  userRole?: string | null;
  userCountry?: string | null;  // ISO country code e.g. "IN", "US"
};

export type RankedFeedItem<T = any> = {
  type: FeedItemType;
  score: number;
  reason?: string;
  data: T;
};

const HOURS_DIVISOR = 1000 * 60 * 60;
const DAY_DIVISOR = HOURS_DIVISOR * 24;

export const calculateHoursOld = (createdAt: Date | string) => {
  return Math.max((Date.now() - new Date(createdAt).getTime()) / HOURS_DIVISOR, 1);
};

const calculateRecencyScore = (createdAt?: Date | string) => {
  if (!createdAt) {
    return 0;
  }

  return Math.max(
    0,
    FEED_SCORE_WEIGHTS.recencyWindowHours - calculateHoursOld(createdAt),
  );
};

const calculateTrustLevelScore = (trustLevel?: string) => {
  switch (trustLevel) {
    case "ELITE":
      return FEED_SCORE_WEIGHTS.trust.elite;

    case "ADVANCED":
      return FEED_SCORE_WEIGHTS.trust.advanced;

    case "VERIFIED":
      return FEED_SCORE_WEIGHTS.trust.verified;

    default:
      return 0;
  }
};

export const getCreatorId = (item: any) => {
  return (
    item?.authorId ||
    item?.ownerId ||
    item?.createdById ||
    item?.postedById ||
    item?.createdBy?.id ||
    item?.owner?.id ||
    item?.author?.id
  );
};

const getFollowingIdSet = (context: FeedContext) => {
  return context.followingIdSet || new Set(context.followingIds);
};

const getSkillNameSet = (context: FeedContext) => {
  return context.skillNameSet || new Set(context.skillNames.map((skill) => skill.toLowerCase()));
};

export const getSkillRegex = (context: FeedContext) => {
  if (context.skillRegex) {
    return context.skillRegex;
  }
  const skillNameSet = getSkillNameSet(context);
  if (skillNameSet.size === 0) {
    return null;
  }
  const escapedSkills = Array.from(skillNameSet).map((skill) =>
    skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  escapedSkills.sort((a, b) => b.length - a.length);
  const pattern = new RegExp(escapedSkills.join("|"), "g");
  context.skillRegex = pattern;
  return pattern;
};

const countTextSkillMatches = (value: unknown, context: FeedContext) => {
  const text = typeof value === "string" ? value.toLowerCase() : "";
  if (!text) {
    return 0;
  }

  const regex = getSkillRegex(context);
  if (!regex) {
    return 0;
  }

  regex.lastIndex = 0;
  const matches = text.match(regex);
  if (!matches) {
    return 0;
  }

  return new Set(matches).size;
};

const countArraySkillMatches = (value: unknown, context: FeedContext) => {
  const skillNameSet = getSkillNameSet(context);

  return Array.isArray(value)
    ? value.filter(
        (item) =>
          typeof item === "string" && skillNameSet.has(item.toLowerCase()),
      ).length
    : 0;
};

export const getFeedItemReason = (
  item: any,

  type: FeedItemType,

  context: FeedContext,
) => {
  switch (type) {
    case "POST":
      if (getFollowingIdSet(context).has(item.authorId)) {
        return "From someone you follow";
      }

      if (countTextSkillMatches(item.content, context) > 0) {
        return "Matches your skills";
      }

      return "Popular with engineers";

    case "PROJECT":
      if (countArraySkillMatches(item.techStack, context) > 0) {
        return "Uses your tech stack";
      }

      return item.verified ? "Verified project" : "Relevant project";

    case "HACKATHON":
      return item.featured ? "Featured hackathon" : "Open for registration";

    case "JOB":
      if (countArraySkillMatches(item.skillsRequired, context) > 0) {
        return "Matches your skills";
      }

      return item.workMode === "REMOTE" ? "Remote opportunity" : "Relevant role";

    case "COMPANY":
      return item.hiringEnabled ? "Actively hiring" : "Recommended company";

    case "COMMUNITY":
      if (countArraySkillMatches(item.tags, context) > 0) {
        return "Matches your interests";
      }

      return "Active community";
  }
};

export const buildRankedFeedItems = <T>(
  items: T[],

  type: FeedItemType,

  context: FeedContext,

  reason?: string,
): RankedFeedItem<T>[] => {
  return items.map((item) => ({
    type,
    score: calculateFeedScore(item, type, context),
    reason: reason || getFeedItemReason(item, type, context),
    data: item,
  }));
};

export const calculateFeedScore = (
  item: any,

  type: FeedItemType,

  context: FeedContext,
) => {
  let score = calculateRecencyScore(item.createdAt);

  switch (type) {
    case "POST":
      if (getFollowingIdSet(context).has(item.authorId)) {
        score += FEED_SCORE_WEIGHTS.posts.following;
      }

      score += (item._count?.likes || item.likesCount || 0) * FEED_SCORE_WEIGHTS.posts.like;
      score +=
        (item._count?.comments || item.commentsCount || 0) *
        FEED_SCORE_WEIGHTS.posts.comment;
      score +=
        (item.author?.engineeringScore || 0) *
        FEED_SCORE_WEIGHTS.posts.authorEngineering;
      score += calculateTrustLevelScore(item.author?.trustLevel);
      score +=
        countTextSkillMatches(item.content, context) *
        FEED_SCORE_WEIGHTS.posts.skillMatch;
      score +=
        (context.interactionMap.get(`POST:${item.id}`) || 0) *
        FEED_SCORE_WEIGHTS.posts.interaction;
      score += context.affinityMap.get(item.authorId) || 0;
      break;

    case "PROJECT":
      if (item.verified) {
        score += FEED_SCORE_WEIGHTS.projects.verified;
      }

      if (item.liveUrl) {
        score += FEED_SCORE_WEIGHTS.projects.live;
      }

      if (item.featured) {
        score += FEED_SCORE_WEIGHTS.projects.featured;
      }

      score += Math.min(
        item.starsCount * FEED_SCORE_WEIGHTS.projects.starMultiplier,
        FEED_SCORE_WEIGHTS.projects.starCap,
      );
      score += Math.min(item.forksCount, FEED_SCORE_WEIGHTS.projects.forkCap);
      score += Math.min(
        item.contributorsCount * FEED_SCORE_WEIGHTS.projects.contributorMultiplier,
        FEED_SCORE_WEIGHTS.projects.contributorCap,
      );

      if (item.lookingFor) {
        score +=
          countTextSkillMatches(item.lookingFor, context) *
          FEED_SCORE_WEIGHTS.projects.lookingForSkillMatch;
      }

      score +=
        countArraySkillMatches(item.techStack, context) *
        FEED_SCORE_WEIGHTS.projects.techStackSkillMatch;
      score +=
        (item.engineeringScore || 0) *
        FEED_SCORE_WEIGHTS.projects.engineeringScore;
      score +=
        (context.interactionMap.get(`PROJECT:${item.id}`) || 0) *
        FEED_SCORE_WEIGHTS.projects.interaction;
      score += context.affinityMap.get(item.ownerId) || 0;
      break;

    case "HACKATHON":
      score += FEED_SCORE_WEIGHTS.hackathons.base;

      if (item.verified) {
        score += FEED_SCORE_WEIGHTS.hackathons.verified;
      }

      if (item.featured) {
        score += FEED_SCORE_WEIGHTS.hackathons.featured;
      }

      if (item.registrationDeadline) {
        const daysLeft =
          (new Date(item.registrationDeadline).getTime() - Date.now()) / DAY_DIVISOR;

        if (daysLeft >= 0) {
          score += Math.max(
            0,
            FEED_SCORE_WEIGHTS.hackathons.deadlineWindowDays - daysLeft,
          );
        }
      }

      score +=
        (item.createdBy?.engineeringScore || 0) *
        FEED_SCORE_WEIGHTS.hackathons.organizerEngineering;
      score +=
        (context.interactionMap.get(`HACKATHON:${item.id}`) || 0) *
        FEED_SCORE_WEIGHTS.hackathons.interaction;
      score += context.affinityMap.get(item.createdById) || 0;
      break;

    case "JOB":
      if (item.featured) {
        score += FEED_SCORE_WEIGHTS.jobs.featured;
      }

      score +=
        countArraySkillMatches(item.skillsRequired, context) *
        FEED_SCORE_WEIGHTS.jobs.skillMatch;

      if (item.type === "INTERNSHIP" && context.isFresher) {
        score += FEED_SCORE_WEIGHTS.jobs.fresherInternship;
      }

      // India-location boost: prioritise jobs from India for Indian users
      if (context.userCountry === "IN") {
        const jobCountry = (item.locationCountry || item.company?.country || "").toUpperCase();
        const jobLocation  = (item.location || "").toLowerCase();
        const indianCities = /\b(india|bengaluru|bangalore|mumbai|delhi|hyderabad|pune|chennai|kolkata|noida|gurugram|gurgaon|ahmedabad|jaipur|surat|lucknow|kochi|indore|bhopal|chandigarh)\b/;
        if (jobCountry === "IN" || jobCountry === "IND" || indianCities.test(jobLocation)) {
          score += FEED_SCORE_WEIGHTS.jobs.indiaLocationBoost;
        }
      }

      score += (item.applicationsCount || 0) * FEED_SCORE_WEIGHTS.jobs.application;
      score += (item.views || 0) * FEED_SCORE_WEIGHTS.jobs.view;

      if (item.workMode === "REMOTE") {
        score += FEED_SCORE_WEIGHTS.jobs.remote;
      }

      score +=
        (context.interactionMap.get(`JOB:${item.id}`) || 0) *
        FEED_SCORE_WEIGHTS.jobs.interaction;
      break;

    case "COMPANY":
      if (item.hiringEnabled) {
        score += FEED_SCORE_WEIGHTS.companies.hiring;
      }

      score += item.totalRatings || 0;
      score +=
        (context.interactionMap.get(`COMPANY:${item.id}`) || 0) *
        FEED_SCORE_WEIGHTS.companies.interaction;
      break;

    case "COMMUNITY":
      score +=
        (item.memberCount || item._count?.members || 0) *
        FEED_SCORE_WEIGHTS.communities.member;
      score += item.trendingScore || 0;
      score += item.activityScore || 0;

      if (item.verified) {
        score += FEED_SCORE_WEIGHTS.communities.verified;
      }

      if (item.visibility === "PUBLIC") {
        score += FEED_SCORE_WEIGHTS.communities.publicVisibility;
      }

      score +=
        countArraySkillMatches(item.tags, context) *
        FEED_SCORE_WEIGHTS.communities.skillMatch;
      score +=
        (context.interactionMap.get(`COMMUNITY:${item.id}`) || 0) *
        FEED_SCORE_WEIGHTS.communities.interaction;
      score += context.affinityMap.get(item.createdById) || 0;
      break;
  }

  return Math.round(score);
};
