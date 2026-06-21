export const queryKeys = {
  health: ["health"] as const,
  auth: {
    me: ["auth", "me"] as const,
  },
  users: {
    me: ["users", "me"] as const,
    full: ["users", "me", "full"] as const,
    skills: ["users", "me", "skills"] as const,
    experiences: ["users", "me", "experiences"] as const,
    educations: ["users", "me", "educations"] as const,
    myProjects: ["users", "me", "projects"] as const,
    publicProfile: (userId: string) => ["users", "profile", userId] as const,
    skillSearch: (query: string) =>
      ["users", "skills", "search", query] as const,
  },
  colleges: {
    all: ["colleges"] as const,
    list: (limit: number) => ["colleges", "list", limit] as const,
    detail: (collegeId: string) => ["colleges", "detail", collegeId] as const,
    departments: (collegeId: string) =>
      ["colleges", collegeId, "departments"] as const,
    standardDepartments: ["colleges", "standard-departments"] as const,
  },
  companies: {
    all: ["companies"] as const,
    list: (params: Record<string, unknown>) =>
      ["companies", "list", params] as const,
    detail: (slug: string) => ["companies", "detail", slug] as const,
    employees: (companyId: string, page: number, limit: number) =>
      ["companies", companyId, "employees", page, limit] as const,
    suggested: () => ["companies", "suggested"] as const,
  },
  communities: {
    all: ["communities"] as const,
    detail: (slug: string) => ["communities", "detail", slug] as const,
    suggested: () => ["communities", "suggested"] as const,
    joined: () => ["communities", "joined"] as const,
    joinRequests: (slug: string) => ["communities", "join-requests", slug] as const,
  },
  chat: {
    all: ["chat"] as const,
    conversations: () => ["chat", "conversations"] as const,
    archived: () => ["chat", "archived"] as const,
    messages: (conversationId: string) =>
      ["chat", "messages", conversationId] as const,
    search: (conversationId: string, query: string) =>
      ["chat", "messages", conversationId, "search", query] as const,
  },
  feed: {
    all: ["feed"] as const,
    list: (viewer: string, limit: number) => ["feed", viewer, limit] as const,
    post: (postId: string) => ["feed", "post", postId] as const,
  },
  projects: {
    all: ["projects"] as const,
    list: (limit: number) => ["projects", "list", limit] as const,
    detail: (idOrSlug: string) => ["projects", "detail", idOrSlug] as const,
    requests: (projectId: string) =>
      ["projects", projectId, "requests"] as const,
    sentInvites: (projectId: string) =>
      ["projects", projectId, "sent-invites"] as const,
    receivedInvites: () => ["projects", "received-invites"] as const,
  },
  teams: {
    all: ["teams"] as const,
    mine: () => ["teams", "mine"] as const,
    detail: (teamId: string) => ["teams", "detail", teamId] as const,
    pendingInvites: () => ["teams", "invites", "pending"] as const,
  },
  social: {
    all: ["social"] as const,
    followers: (userId: string, limit: number) =>
      ["social", userId, "followers", limit] as const,
    following: (userId: string, limit: number) =>
      ["social", userId, "following", limit] as const,
    connections: (userId: string, limit: number) =>
      ["social", userId, "connections", limit] as const,
    suggested: (limit: number) => ["social", "suggested", limit] as const,
    mutual: (userId: string, limit: number) =>
      ["social", userId, "mutual", limit] as const,
  },
  hackathons: {
    all: ["hackathons"] as const,
    list: (params?: Record<string, unknown>) => ["hackathons", "list", params || {}] as const,
    detail: (id: string) => ["hackathons", "detail", id] as const,
    leaderboard: (id: string) => ["hackathons", "leaderboard", id] as const,
  },
  jobs: {
    all: ["jobs"] as const,
    list: () => ["jobs", "list"] as const,
    detail: (slug: string) => ["jobs", "detail", slug] as const,
    company: (companyId: string) => ["jobs", "company", companyId] as const,
    recruiter: () => ["jobs", "recruiter"] as const,
  },
  jobApplications: {
    all: ["job-applications"] as const,
    mine: () => ["job-applications", "mine"] as const,
    byJob: (jobId: string) => ["job-applications", "job", jobId] as const,
  },
  recommendations: {
    all: ["recommendations"] as const,
    savedJobs: () => ["recommendations", "saved-jobs"] as const,
    jobs: () => ["recommendations", "jobs"] as const,
    internships: () => ["recommendations", "internships"] as const,
    trendingJobs: () => ["recommendations", "trending-jobs"] as const,
    advancedJobs: () => ["recommendations", "advanced-jobs"] as const,
    collaborators: () => ["recommendations", "collaborators"] as const,
    projects: () => ["recommendations", "projects"] as const,
  },
  referrals: {
    all: ["referrals"] as const,
    received: () => ["referrals", "received"] as const,
    sent: () => ["referrals", "sent"] as const,
  },
  reputation: {
    all: ["reputation"] as const,
    leaderboard: () => ["reputation", "leaderboard"] as const,
    me: () => ["reputation", "me"] as const,
    user: (username: string) => ["reputation", "user", username] as const,
    history: () => ["reputation", "history"] as const,
    badges: () => ["reputation", "badges"] as const,
    topBadges: () => ["reputation", "top-badges"] as const,
  },
  leaderboards: {
    all: ["leaderboards"] as const,
    engineers: () => ["leaderboards", "engineers"] as const,
    projects: () => ["leaderboards", "projects"] as const,
    hackathonEngineers: () => ["leaderboards", "hackathon-engineers"] as const,
    teams: () => ["leaderboards", "teams"] as const,
    fastestGrowing: () => ["leaderboards", "fastest-growing"] as const,
  },
  recruiter: {
    dashboard: () => ["recruiter", "dashboard"] as const,
    pipeline: (jobId: string) => ["recruiter", "pipeline", jobId] as const,
  },
  analytics: {
    candidates: (jobId: string) => ["analytics", "candidates", jobId] as const,
    recruiterInsights: () => ["analytics", "recruiter-insights"] as const,
  },
  engineering: {
    portfolio: (username: string) => ["engineering", "portfolio", username] as const,
  },
  activities: {
    timeline: (limit: number) => ["activities", "timeline", limit] as const,
  },
  affinity: {
    all: ["affinity"] as const,
  },
  trending: {
    feed: (limit: number) => ["trending", "feed", limit] as const,
  },
  search: {
    all: ["search"] as const,
    global: (query: string) => ["search", "global", query] as const,
    users: (query: string) => ["search", "users", query] as const,
    projects: (query: string) => ["search", "projects", query] as const,
    hackathons: (query: string) => ["search", "hackathons", query] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (page: number, limit: number) =>
      ["notifications", "list", page, limit] as const,
  },
  discovery: {
    all: ["discovery"] as const,
    feed: () => ["discovery", "feed"] as const,
    suggested: {
      engineers: (limit: number) =>
        ["discovery", "suggested", "engineers", limit] as const,
      mentors: (limit: number) =>
        ["discovery", "suggested", "mentors", limit] as const,
      recruiters: (limit: number) =>
        ["discovery", "suggested", "recruiters", limit] as const,
      collaborators: (limit: number) =>
        ["discovery", "suggested", "collaborators", limit] as const,
      teammates: (limit: number) =>
        ["discovery", "suggested", "teammates", limit] as const,
      projects: (limit: number) =>
        ["discovery", "suggested", "projects", limit] as const,
      jobs: (limit: number) =>
        ["discovery", "suggested", "jobs", limit] as const,
      hackathons: (limit: number) =>
        ["discovery", "suggested", "hackathons", limit] as const,
      companies: (limit: number) =>
        ["discovery", "suggested", "companies", limit] as const,
      posts: (limit: number) =>
        ["discovery", "suggested", "posts", limit] as const,
      communities: (limit: number) =>
        ["discovery", "suggested", "communities", limit] as const,
    },
    trending: {
      communities: () => ["discovery", "trending", "communities"] as const,
    },
  },
  admin: {
    stats: ["admin", "stats"] as const,
    analytics: (range: number) => ["admin", "analytics", range] as const,
    users: (search: string) => ["admin", "users", search] as const,
    collegeAdmins: (collegeId: string) => ["admin", "colleges", collegeId, "admins"] as const,
    companyAdmins: (companyId: string) => ["admin", "companies", companyId, "admins"] as const,
  },
  events: {
    all: ["events"] as const,
    list: (params?: Record<string, unknown>) => ["events", "list", params || {}] as const,
    detail: (id: string) => ["events", "detail", id] as const,
  },
};
