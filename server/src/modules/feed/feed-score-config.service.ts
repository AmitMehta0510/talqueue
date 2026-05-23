export const FEED_SCORE_WEIGHTS = {
  recencyWindowHours: 72,

  trust: {
    elite: 100,
    advanced: 70,
    verified: 40,
  },

  posts: {
    following: 120,
    like: 4,
    comment: 6,
    authorEngineering: 0.08,
    skillMatch: 15,
    interaction: 5,
  },

  projects: {
    verified: 100,
    live: 60,
    featured: 40,
    starMultiplier: 2,
    starCap: 100,
    forkCap: 40,
    contributorMultiplier: 5,
    contributorCap: 40,
    lookingForSkillMatch: 30,
    techStackSkillMatch: 35,
    engineeringScore: 0.3,
    interaction: 6,
  },

  hackathons: {
    base: 80,
    verified: 60,
    featured: 60,
    deadlineWindowDays: 40,
    organizerEngineering: 0.05,
    interaction: 5,
  },

  jobs: {
    featured: 80,
    skillMatch: 30,
    fresherInternship: 120,
    application: 0.5,
    view: 0.1,
    remote: 20,
    interaction: 6,
  },

  companies: {
    hiring: 50,
    interaction: 5,
  },

  communities: {
    member: 0.4,
    verified: 80,
    publicVisibility: 20,
    skillMatch: 25,
    interaction: 5,
  },

  aiReranking: {
    affinityMultiplier: 1.5,
    interaction: 4,
    postSkillMatch: 15,
    projectSkillMatch: 18,
    jobSkillMatch: 20,
    creatorEngineering: 0.04,
    companyDiversityPenalty: 20,
    eliteCreator: 120,
    advancedCreator: 70,
  },
} as const;

export type FeedScoreWeights = typeof FEED_SCORE_WEIGHTS;
