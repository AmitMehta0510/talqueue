export const queryKeys = {
  health: ["health"] as const,
  auth: {
    me: ["auth", "me"] as const,
  },
  feed: {
    all: ["feed"] as const,
    list: (viewer: string, limit: number) => ["feed", viewer, limit] as const,
  },
  projects: {
    all: ["projects"] as const,
    list: (limit: number) => ["projects", "list", limit] as const,
    detail: (idOrSlug: string) => ["projects", "detail", idOrSlug] as const,
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
