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
    skillSearch: (query: string) => ["users", "skills", "search", query] as const,
  },
  colleges: {
    all: ["colleges"] as const,
    list: (limit: number) => ["colleges", "list", limit] as const,
    departments: (collegeId: string) => ["colleges", collegeId, "departments"] as const,
  },
  companies: {
    all: ["companies"] as const,
    list: (params: Record<string, unknown>) => ["companies", "list", params] as const,
    detail: (slug: string) => ["companies", "detail", slug] as const,
    employees: (companyId: string, page: number, limit: number) =>
      ["companies", companyId, "employees", page, limit] as const,
    suggested: () => ["companies", "suggested"] as const,
  },
  communities: {
    all: ["communities"] as const,
    detail: (slug: string) => ["communities", "detail", slug] as const,
    suggested: () => ["communities", "suggested"] as const,
  },
  chat: {
    all: ["chat"] as const,
    conversations: () => ["chat", "conversations"] as const,
    messages: (conversationId: string) => ["chat", "messages", conversationId] as const,
    search: (conversationId: string, query: string) =>
      ["chat", "messages", conversationId, "search", query] as const,
  },
  feed: {
    all: ["feed"] as const,
    list: (viewer: string, limit: number) => ["feed", viewer, limit] as const,
  },
  projects: {
    all: ["projects"] as const,
    list: (limit: number) => ["projects", "list", limit] as const,
    detail: (idOrSlug: string) => ["projects", "detail", idOrSlug] as const,
    requests: (projectId: string) => ["projects", projectId, "requests"] as const,
    sentInvites: (projectId: string) => ["projects", projectId, "sent-invites"] as const,
    receivedInvites: () => ["projects", "received-invites"] as const,
  },
  teams: {
    all: ["teams"] as const,
    mine: () => ["teams", "mine"] as const,
    detail: (teamId: string) => ["teams", "detail", teamId] as const,
  },
  social: {
    all: ["social"] as const,
    followers: (userId: string, limit: number) => ["social", userId, "followers", limit] as const,
    following: (userId: string, limit: number) => ["social", userId, "following", limit] as const,
    connections: (userId: string, limit: number) => ["social", userId, "connections", limit] as const,
    suggested: (limit: number) => ["social", "suggested", limit] as const,
    mutual: (userId: string, limit: number) => ["social", userId, "mutual", limit] as const,
  },
  hackathons: {
    all: ["hackathons"] as const,
    list: () => ["hackathons", "list"] as const,
    detail: (id: string) => ["hackathons", "detail", id] as const,
    leaderboard: (id: string) => ["hackathons", "leaderboard", id] as const,
  },
  jobs: {
    all: ["jobs"] as const,
    list: () => ["jobs", "list"] as const,
  },
  search: {
    all: ["search"] as const,
    global: (query: string) => ["search", "global", query] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (page: number, limit: number) => ["notifications", "list", page, limit] as const,
  },
};
