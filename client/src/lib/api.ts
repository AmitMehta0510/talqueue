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
  availabilityStatus?: string;
  primaryRole?: string | null;
  profile?: {
    fullName?: string | null;
    headline?: string | null;
    avatarUrl?: string | null;
    location?: string | null;
    bio?: string | null;
    availabilityText?: string | null;
    githubUrl?: string | null;
    linkedinUrl?: string | null;
    portfolioUrl?: string | null;
    bannerUrl?: string | null;
    resumeUrl?: string | null;
    collegeId?: string | null;
    departmentId?: string | null;
    graduationYear?: number | null;
    college?: College | null;
    department?: Department | null;
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
  acceptingMentorship?: boolean;
  _count?: {
    skills?: number;
    experiences?: number;
    educations?: number;
    roles?: number;
  };
  skills?: UserSkill[];
  experiences?: Experience[];
  educations?: Education[];
  createdAt?: string;
  updatedAt?: string;
};

export type College = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  _count?: {
    departments?: number;
    profiles?: number;
    educations?: number;
  };
};

export type Department = {
  id: string;
  name: string;
  collegeId: string;
};

export type UserSkill = {
  id: string;
  level?: string;
  skill?: {
    id: string;
    name?: string;
    normalizedName?: string;
  };
  createdAt?: string;
};

export type Skill = {
  id: string;
  name: string;
  category?: string | null;
  searchScore?: number;
  verified?: boolean;
  createdAt?: string;
};

export type Experience = {
  id: string;
  companyName?: string | null;
  title?: string | null;
  employmentType?: string | null;
  startDate?: string;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string | null;
  verified?: boolean;
  verificationScore?: number;
  techStack?: string[];
  skillsUsed?: string[];
  teamSize?: number | null;
  company?: {
    name?: string;
    logoUrl?: string | null;
    verified?: boolean;
  } | null;
};

export type Education = {
  id: string;
  collegeId?: string;
  departmentId?: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  current?: boolean;
  college?: College | null;
  department?: Department | null;
};

export type CollegePage = {
  colleges: College[];
  nextCursor?: string | null;
  hasNextPage?: boolean;
  limit?: number;
};

export type SkillsPage = {
  skills: UserSkill[];
  nextCursor?: string | null;
  hasNextPage?: boolean;
  limit?: number;
};

export type ExperiencesPage = {
  experiences: Experience[];
  nextCursor?: string | null;
  hasNextPage?: boolean;
  limit?: number;
};

export type EducationsPage = {
  educations: Education[];
  nextCursor?: string | null;
  hasNextPage?: boolean;
  limit?: number;
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

export type FeedItemType =
  | "POST"
  | "PROJECT"
  | "HACKATHON"
  | "JOB"
  | "COMPANY"
  | "COMMUNITY";

export type FeedItem =
  | {
      type: "POST";
      score: number;
      reason?: string;
      data: FeedPost;
    }
  | {
      type: "PROJECT";
      score: number;
      reason?: string;
      data: Project;
    }
  | {
      type: "JOB";
      score: number;
      reason?: string;
      data: Job;
    }
  | {
      type: Exclude<FeedItemType, "POST" | "PROJECT" | "JOB">;
      score: number;
      reason?: string;
      data: FeedPost | Project | Job | Record<string, unknown>;
    };

export type FeedPage = {
  posts: FeedPost[];
  nextCursor?: string | null;
  hasNextPage?: boolean;
  limit?: number;
};

export type Project = {
  id: string;
  ownerId?: string;
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
  members?: ProjectMember[];
  joinRequests?: ProjectJoinRequest[];
  requiredRoles?: ProjectRoleRequirement[];
  hackathonSubmissions?: Array<Record<string, unknown>>;
  liveUrl?: string | null;
  githubUrl?: string | null;
  videoDemoUrl?: string | null;
  screenshots?: unknown;
  starsCount?: number;
  forksCount?: number;
  commitCount?: number;
  contributorsCount?: number;
  openIssuesCount?: number;
  pullRequestsCount?: number;
  primaryLanguage?: string | null;
  languages?: Record<string, number> | string[] | null;
  repoVisibility?: string | null;
  repoCreatedAt?: string | null;
  repoUpdatedAt?: string | null;
  lastGithubSyncAt?: string | null;
  deploymentStatus?: string | null;
  verificationScore?: number;
  rankingScore?: number;
  trustLevel?: string;
  _count?: {
    members?: number;
    joinRequests?: number;
  };
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
  archivedAt?: string | null;
  deletedAt?: string | null;
};

export type ProjectMember = {
  id: string;
  projectId: string;
  userId: string;
  role?: string;
  joinedAt?: string;
  user?: User;
};

export type ProjectRoleRequirement = {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  slots?: number;
  filledSlots?: number;
  createdAt?: string;
};

export type ProjectJoinRequest = {
  id: string;
  projectId: string;
  userId: string;
  message?: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
  reviewedAt?: string | null;
  withdrawnAt?: string | null;
  createdAt?: string;
  user?: User;
};

export type ProjectInvite = {
  id: string;
  projectId: string;
  invitedUserId: string;
  invitedById: string;
  message?: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  reviewedAt?: string | null;
  createdAt?: string;
  project?: Project;
  invitedUser?: User;
  invitedBy?: User;
};

export type ProjectMutationPayload = {
  title?: string;
  description?: string;
  shortDescription?: string;
  githubUrl?: string;
  liveUrl?: string;
  videoDemoUrl?: string;
  techStack?: string[];
  deploymentStatus?: string;
  visibility?: "PUBLIC" | "PRIVATE";
  lookingFor?: string;
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

export type NotificationType =
  | "LIKE"
  | "COMMENT"
  | "FOLLOW"
  | "PROJECT_INVITE"
  | "TEAM_INVITE"
  | "REFERRAL"
  | "JOB_APPLIED"
  | "JOB_APPLICATION_UPDATE"
  | "JOB_HIRED"
  | "HACKATHON_JUDGING"
  | "HACKATHON_WINNER"
  | "SYSTEM"
  | "POST_SHARED"
  | "POST_MENTION"
  | "COMMENT_MENTION"
  | "COMMENT_REPLY"
  | "POST_SAVED"
  | "CONNECTION_REQUEST"
  | "CONNECTION_ACCEPTED"
  | "MENTORSHIP"
  | "MESSAGE"
  | "COMMUNITY_JOINED"
  | "PROJECT_JOIN_REQUEST"
  | "PROJECT_JOIN_ACCEPTED"
  | "PROJECT_JOIN_REJECTED";

export type PlatformNotification = {
  id: string;
  userId: string;
  actorId?: string | null;
  actor?: User | null;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  isRead: boolean;
  readAt?: string | null;
  archived: boolean;
  groupKey?: string | null;
  createdAt: string;
};

export type NotificationsPage = {
  notifications: PlatformNotification[];
  unreadCount: number;
  page: number;
  limit: number;
};

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5000/api/v1";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  timeoutMs?: number;
};

type EndpointOptions = Pick<RequestOptions, "signal" | "timeoutMs">;

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

type CursorOptions = EndpointOptions & {
  cursor?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const createRequestSignal = (signal?: AbortSignal | null, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  const abort = () => controller.abort();

  if (signal?.aborted) {
    controller.abort();
  } else {
    signal?.addEventListener("abort", abort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abort);
    },
  };
};

async function request<T>(path: string, options: RequestOptions = {}) {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers);
  const { body, signal: requestSignal, timeoutMs, ...fetchOptions } = options;
  const { signal, cleanup } = createRequestSignal(requestSignal, timeoutMs);

  if (!headers.has("Content-Type") && body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      signal,
      headers,
      body:
        body === undefined || typeof body === "string"
          ? body
          : JSON.stringify(body),
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
  } finally {
    cleanup();
  }
}

export const api = {
  baseUrl: API_URL,
  health: (options?: EndpointOptions) => request<{ routes?: Record<string, string> }>("", options),
  login: (body: { email: string; password: string }) =>
    request<AuthPayload>("/auth/login", { method: "POST", body }),
  register: (body: {
    email: string;
    username: string;
    password: string;
    fullName: string;
    role: RoleName;
  }) => request<AuthPayload>("/auth/register", { method: "POST", body }),
  me: (options?: EndpointOptions) => request<User>("/auth/me", options),
  logout: () => request<{ loggedOut: boolean }>("/auth/logout", { method: "POST" }),
  myProfile: (options?: EndpointOptions) => request<User>("/users/me", options),
  myFullProfile: (options?: EndpointOptions) => request<User>("/users/me/full", options),
  mySkills: (limit = 20, options?: CursorOptions) => {
    const { cursor, ...requestOptions } = options || {};
    return request<SkillsPage>(
      `/users/me/skills${toQuery({ limit, cursor })}`,
      requestOptions,
    );
  },
  myExperiences: (limit = 20, options?: CursorOptions) => {
    const { cursor, ...requestOptions } = options || {};
    return request<ExperiencesPage>(
      `/users/me/experiences${toQuery({ limit, cursor })}`,
      requestOptions,
    );
  },
  myEducations: (limit = 20, options?: CursorOptions) => {
    const { cursor, ...requestOptions } = options || {};
    return request<EducationsPage>(
      `/users/me/educations${toQuery({ limit, cursor })}`,
      requestOptions,
    );
  },
  updateProfile: (body: {
    fullName?: string;
    username?: string;
    bio?: string;
    headline?: string;
    location?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    resumeUrl?: string;
    availabilityText?: string;
    githubUrl?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    graduationYear?: number;
    collegeId?: string;
    departmentId?: string;
  }) => request<User>("/users/me", { method: "PUT", body }),
  addExperience: (body: {
    companyName: string;
    title: string;
    employmentType: string;
    startDate: string;
    endDate?: string;
    isCurrent?: boolean;
    description?: string;
    workEmail?: string;
    managerName?: string;
    managerEmail?: string;
    managerLinkedinUrl?: string;
    skillsUsed?: string[];
    techStack?: string[];
    teamSize?: number;
  }) => request<Experience>("/users/me/experiences", { method: "POST", body }),
  addEducation: (body: {
    collegeId: string;
    departmentId?: string;
    degree?: string;
    fieldOfStudy?: string;
    startYear?: number;
    endYear?: number;
    current?: boolean;
  }) => request<Education>("/users/me/educations", { method: "POST", body }),
  addSkill: (body: { skillId: string; level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT" }) =>
    request<UserSkill>("/users/me/skills", { method: "POST", body }),
  searchSkills: (q: string, options?: EndpointOptions) =>
    request<Skill[]>(`/users/skills/search${toQuery({ q, limit: 12 })}`, options),
  searchColleges: (q: string) => request<College[]>(`/colleges/search${toQuery({ q })}`),
  departments: (collegeId: string) => request<Department[]>(`/colleges/${collegeId}/departments`),
  publicPosts: (limit = 12, options?: EndpointOptions) =>
    request<FeedPage>(`/posts/feed${toQuery({ limit })}`, options),
  personalizedFeed: (limit = 12, options?: EndpointOptions) =>
    request<FeedItem[]>(`/feed${toQuery({ limit })}`, options),
  createPost: (body: { content: string; type: string; tags?: string[] }) =>
    request<FeedPost>("/posts", { method: "POST", body }),
  likePost: (id: string) => request<{ liked?: boolean }>(`/posts/${id}/like`, { method: "POST" }),
  savePost: (id: string) => request<{ saved?: boolean }>(`/posts/${id}/save`, { method: "POST" }),
  projects: (limit = 12, options?: EndpointOptions) =>
    request<Project[]>(`/projects${toQuery({ limit })}`, options),
  project: (idOrSlug: string, options?: EndpointOptions) =>
    request<Project>(`/projects/${idOrSlug}`, options),
  createProject: (body: {
    title: string;
    description: string;
    shortDescription?: string;
    githubUrl?: string;
    liveUrl?: string;
    videoDemoUrl?: string;
    techStack?: string[];
    deploymentStatus?: string;
    visibility: "PUBLIC" | "PRIVATE";
    lookingFor?: string;
  }) => request<Project>("/projects", { method: "POST", body }),
  joinProject: (id: string, message?: string) =>
    request<unknown>(`/projects/${id}/join`, { method: "POST", body: { message } }),
  projectJoinRequests: (id: string, options?: EndpointOptions) =>
    request<ProjectJoinRequest[]>(`/projects/${id}/requests`, options),
  reviewProjectJoinRequest: (requestId: string, status: "ACCEPTED" | "REJECTED") =>
    request<ProjectJoinRequest>(`/projects/requests/${requestId}/review`, {
      method: "PATCH",
      body: { status },
    }),
  withdrawProjectJoinRequest: (requestId: string) =>
    request<ProjectJoinRequest>(`/projects/requests/${requestId}/withdraw`, {
      method: "PATCH",
    }),
  inviteUserToProject: (projectId: string, userId: string, message?: string) =>
    request<ProjectInvite>(`/projects/${projectId}/invite/${userId}`, {
      method: "POST",
      body: { message },
    }),
  reviewProjectInvite: (inviteId: string, status: "ACCEPTED" | "REJECTED") =>
    request<ProjectInvite>(`/projects/invites/${inviteId}/review`, {
      method: "PATCH",
      body: { status },
    }),
  leaveProject: (projectId: string) =>
    request<{ success: boolean }>(`/projects/${projectId}/leave`, { method: "DELETE" }),
  removeProjectMember: (projectId: string, memberId: string) =>
    request<{ success: boolean }>(`/projects/${projectId}/members/${memberId}`, {
      method: "DELETE",
    }),
  receivedProjectInvites: (options?: EndpointOptions) =>
    request<ProjectInvite[]>("/projects/invites/received", options),
  sentProjectInvites: (projectId: string, options?: EndpointOptions) =>
    request<ProjectInvite[]>(`/projects/${projectId}/invites`, options),
  completeProject: (projectId: string) =>
    request<Project>(`/projects/${projectId}/complete`, { method: "PATCH" }),
  archiveProject: (projectId: string) =>
    request<Project>(`/projects/${projectId}/archive`, { method: "PATCH" }),
  restoreProject: (projectId: string) =>
    request<Project>(`/projects/${projectId}/restore`, { method: "PATCH" }),
  deleteProject: (projectId: string) =>
    request<Project>(`/projects/${projectId}`, { method: "DELETE" }),
  updateProject: (projectId: string, body: ProjectMutationPayload) =>
    request<Project>(`/projects/${projectId}`, { method: "PATCH", body }),
  syncGithubProject: (projectId: string) =>
    request<Project>(`/projects/${projectId}/sync-github`, { method: "POST" }),
  jobs: (options?: EndpointOptions) => request<Job[]>("/jobs", options),
  searchGlobal: (q: string, options?: EndpointOptions) =>
    request<SearchResults>(`/search/global${toQuery({ q })}`, options),
  searchUsers: (q: string, options?: EndpointOptions) =>
    request<User[]>(`/search/users${toQuery({ q, limit: 12 })}`, options),
  searchProjects: (q: string, options?: EndpointOptions) =>
    request<Project[]>(`/search/projects${toQuery({ q, limit: 12 })}`, options),
  trackFeedImpression: (body: {
    entityId: string;
    entityType: FeedItemType;
    position?: number;
    clicked?: boolean;
    hidden?: boolean;
  }) => request<{ success: boolean }>("/feed/impressions", { method: "POST", body }),
  notifications: (page = 1, limit = 20, options?: EndpointOptions) =>
    request<NotificationsPage>(`/notifications${toQuery({ page, limit })}`, options),
  markNotificationRead: (id: string) =>
    request<null>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () =>
    request<null>("/notifications/read-all", { method: "PATCH" }),
  archiveNotification: (id: string) =>
    request<null>(`/notifications/${id}/archive`, { method: "PATCH" }),
  deleteNotification: (id: string) =>
    request<null>(`/notifications/${id}`, { method: "DELETE" }),
};
