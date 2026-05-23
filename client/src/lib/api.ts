import { authStorage } from "./storage";

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type RoleName = "STUDENT" | "PROFESSOR" | "PROFESSIONAL" | "RECRUITER";

export type User = {
  id: string;
  email: string;
  username: string;
  status?: string;
  primaryRole?: string | null;
  profile?: {
    fullName?: string | null;
    headline?: string | null;
    avatarUrl?: string | null;
    location?: string | null;
    bio?: string | null;
  } | null;
  roles?: Array<{ role?: { name?: string } }>;
  followersCount?: number;
  followingCount?: number;
  connectionCount?: number;
  postCount?: number;
  profileCompleteness?: number;
  reputationScore?: number;
  engineeringScore?: number;
  trustLevel?: string;
  verifiedEngineer?: boolean;
  openToWork?: boolean;
  openToInternship?: boolean;
  acceptingCollaborators?: boolean;
  acceptingReferrals?: boolean;
};

export type AuthPayload = {
  token: string;
  user: User;
};

export type FeedPost = {
  id: string;
  title?: string;
  content?: string;
  description?: string;
  type?: string;
  createdAt?: string;
  author?: User;
  user?: User;
  tags?: Array<string | { tag?: string }>;
  likesCount?: number;
  commentsCount?: number;
  saveCount?: number;
  shareCount?: number;
  project?: Project;
  hackathon?: Record<string, unknown>;
  item?: FeedPost | Project | Job | Record<string, unknown>;
  itemType?: string;
  reason?: string;
  score?: number;
};

export type FeedPage = {
  posts: FeedPost[];
  nextCursor?: string | null;
  hasNextPage?: boolean;
  limit?: number;
};

export type Project = {
  id: string;
  title?: string;
  slug?: string;
  description?: string;
  shortDescription?: string | null;
  status?: string;
  visibility?: string;
  lookingFor?: string | null;
  featured?: boolean;
  verified?: boolean;
  engineeringScore?: number;
  techStack?: string[] | Record<string, unknown> | null;
  searchTags?: string[];
  domain?: string | null;
  difficultyLevel?: string | null;
  owner?: User;
  members?: unknown[];
  createdAt?: string;
};

export type Job = {
  id: string;
  title?: string;
  slug?: string;
  description?: string;
  location?: string | null;
  workMode?: string | null;
  type?: string;
  experienceLevel?: string | null;
  skillsRequired?: string[];
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  featured?: boolean;
  applicationsCount?: number;
  company?: {
    name?: string;
    logoUrl?: string | null;
    verified?: boolean;
    tagline?: string | null;
  };
  createdAt?: string;
};

export type SearchResults = {
  users?: User[];
  projects?: Project[];
  hackathons?: Array<Record<string, unknown>>;
  jobs?: Job[];
  [key: string]: unknown;
};

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5000/api/v1";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

const toQuery = (params: Record<string, string | number | boolean | undefined>) => {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `?${query}` : "";
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body:
      options.body === undefined || typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body),
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      payload?.message || response.statusText || "Request failed",
      response.status,
    );
  }

  return payload as ApiEnvelope<T>;
}

export const api = {
  baseUrl: API_URL,
  health: () => request<{ routes?: Record<string, string> }>(""),
  login: (body: { email: string; password: string }) =>
    request<AuthPayload>("/auth/login", { method: "POST", body }),
  register: (body: {
    email: string;
    username: string;
    password: string;
    fullName: string;
    role: RoleName;
  }) => request<AuthPayload>("/auth/register", { method: "POST", body }),
  me: () => request<User>("/auth/me"),
  logout: () => request<{ loggedOut: boolean }>("/auth/logout", { method: "POST" }),
  publicPosts: (limit = 12) => request<FeedPage>(`/posts/feed${toQuery({ limit })}`),
  personalizedFeed: (limit = 12) => request<FeedPost[]>(`/feed${toQuery({ limit })}`),
  createPost: (body: { content: string; type: string; tags?: string[] }) =>
    request<FeedPost>("/posts", { method: "POST", body }),
  likePost: (id: string) => request<{ liked?: boolean }>(`/posts/${id}/like`, { method: "POST" }),
  savePost: (id: string) => request<{ saved?: boolean }>(`/posts/${id}/save`, { method: "POST" }),
  projects: (limit = 12) => request<Project[]>(`/projects${toQuery({ limit })}`),
  createProject: (body: {
    title: string;
    description: string;
    visibility: "PUBLIC" | "PRIVATE";
    lookingFor?: string;
  }) => request<Project>("/projects", { method: "POST", body }),
  joinProject: (id: string, message?: string) =>
    request<unknown>(`/projects/${id}/join`, { method: "POST", body: { message } }),
  jobs: () => request<Job[]>("/jobs"),
  searchGlobal: (q: string) => request<SearchResults>(`/search/global${toQuery({ q })}`),
  searchUsers: (q: string) => request<User[]>(`/search/users${toQuery({ q, limit: 12 })}`),
  searchProjects: (q: string) =>
    request<Project[]>(`/search/projects${toQuery({ q, limit: 12 })}`),
};
