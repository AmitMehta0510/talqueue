import { request, toQuery, ApiError, API_URL } from "../core/api/client";
import type { EndpointOptions, CursorOptions } from "../core/api/client";
import { authApi } from "../features/auth/services/auth.api";
import { jobsApi, PLACEMENT_DRIVE_STATUS_LABELS } from "../features/jobs/services/jobs.api";
import { storageApi } from "../features/storage/services/storage.api";

// Re-export all model types for backward compatibility
export * from "../core/types/models";
export { ApiError, PLACEMENT_DRIVE_STATUS_LABELS };

import type {
  User,
  SkillsPage,
  ExperiencesPage,
  EducationsPage,
  Experience,
  Education,
  UserSkill,
  Skill,
  College,
  CollegePage,
  CollegePlacementSummary,
  Department,
  StandardDepartment,
  CompanyPage,
  Company,
  CompanyEmployeesPage,
  Conversation,
  ChatMessagesPage,
  ChatMessage,
  ConversationParticipant,
  FeedPage,
  FeedItem,
  FeedPost,
  Project,
  ProjectJoinRequest,
  ProjectInvite,
  Team,
  TeamInvite,
  SocialFollow,
  SocialConnection,
  SuggestedConnectionsPage,
  MutualConnectionsPage,
  Hackathon,
  HackathonRegistration,
  HackathonSubmission,
  HackathonJudge,
  HackathonLeaderboard,
  SearchResults,
  PlatformNotification,
  NotificationsPage,
  JobApplication,
  CollegeMutationPayload,
  DepartmentMutationPayload,
  CompanyMutationPayload,
  CommunityMutationPayload,
  CreateGroupConversationPayload,
  SendMessagePayload,
  ChatAttachment,
  HackathonMutationPayload,
  HackathonSubmissionPayload,
  HackathonEvaluationPayload,
  ReferralRequestPayload,
  InteractionPayload,
  LeaderboardResult,
  CandidateRanking,
  RecruiterInsights,
  RecruiterDashboard,
  RecruiterJobPipeline,
  EngineeringPortfolio,
  TrendingFeedItem,
  Event,
  RSVPStatus,
  CompanyType,
  CompanySize,
  Community,
  ExternalJobApplication,
  PlacementDrive,
  PlacementDriveApplication,
  PlacementDriveApplicationStatus,
  PlacementDriveInvite,
  PlacementDriveRound,
  EligibilityResult,
  PlacementStats,
  AlumniClaim,
  ProjectMutationPayload,
  FollowersPage,
  FollowingPage,
  ConnectionsPage,
  FeedItemType,
  ReputationSummary,
  ReputationHistoryItem,
  Badge,
  ActivityPage,
  Job,
  CdcrMember,
} from "../core/types/models";

const remainingApi = {
  baseUrl: API_URL,
  health: (options?: EndpointOptions) => request<{ status: string }>("/health", options),
  myProfile: (options?: EndpointOptions) => request<User>("/users/me", options),
  myFullProfile: (options?: EndpointOptions) =>
    request<User>("/users/me/full", options),
  userProfile: (userId: string, options?: EndpointOptions) =>
    request<User>(`/users/${userId}`, options),
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
    leetcodeUrl?: string;
    hackerrankUrl?: string;
    gfgUrl?: string;
    graduationYear?: number;
    collegeId?: string;
    departmentId?: string;
    acceptingReferrals?: boolean;
    openToWork?: boolean;
    openToInternship?: boolean;
    acceptingCollaborators?: boolean;
    acceptingMentorship?: boolean;
    availabilityStatus?: string;
  }) => request<User>("/users/me", { method: "PUT", body }),
  addExperience: (body: {
    companyName: string;
    companyWebsiteUrl?: string;
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
    collegeId?: string;
    customCollegeName?: string;
    departmentId?: string;
    degree?: string;
    fieldOfStudy?: string;
    startYear?: number;
    endYear?: number;
    current?: boolean;
  }) => request<Education>("/users/me/educations", { method: "POST", body }),
  addSkill: (body: {
    skillId: string;
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  }) => request<UserSkill>("/users/me/skills", { method: "POST", body }),
  deleteSkill: (skillId: string) =>
    request<{ id: string }>(`/users/me/skills/${skillId}`, { method: "DELETE" }),
  verifySkills: () =>
    request<{ success: boolean; message: string; verifiedCount: number }>("/users/me/skills/verify", { method: "POST" }),
  upgradePremium: () =>
    request<{ success: boolean; message: string }>("/users/me/upgrade-premium", { method: "POST" }),
  deleteExperience: (experienceId: string) =>
    request<{ id: string }>(`/users/me/experiences/${experienceId}`, { method: "DELETE" }),
  deleteEducation: (educationId: string) =>
    request<{ id: string }>(`/users/me/educations/${educationId}`, { method: "DELETE" }),
  updateExperience: (experienceId: string, body: {
    companyWebsiteUrl?: string;
    title?: string;
    employmentType?: string;
    startDate?: string;
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
  }) => request<Experience>(`/users/me/experiences/${experienceId}`, { method: "PUT", body }),
  updateEducation: (educationId: string, body: {
    collegeId?: string;
    customCollegeName?: string;
    departmentId?: string;
    degree?: string;
    fieldOfStudy?: string;
    startYear?: number;
    endYear?: number;
    current?: boolean;
  }) => request<Education>(`/users/me/educations/${educationId}`, { method: "PUT", body }),
  getAdminStats: (options?: EndpointOptions) =>
    request<{
      userCount: number;
      collegeCount: number;
      companyCount: number;
      projectCount: number;
      jobCount: number;
      postCount: number;
      hackathonCount: number;
      communityCount: number;
      referralCount: number;
      connectionCount: number;
      messageCount: number;
      activeJobCount: number;
      openProjectCount: number;
      newUsersToday: number;
      newUsersThisWeek: number;
      statusDistribution: Array<{ status: string; count: number }>;
      trustLevelDistribution: Array<{ trustLevel: string; count: number }>;
      userRoleDistribution: Array<{ role: string; count: number }>;
      platformRoleDistribution: Array<{ roleName: string; count: number }>;
    }>("/admin/stats", options),
  getAdminAnalytics: (params: { range?: number }, options?: EndpointOptions) =>
    request<{
      range: number;
      generatedAt: string;
      userRegistrations: Array<{ date: string; count: number }>;
      userFootprint: Array<{ date: string; count: number }>;
    }>(`/admin/analytics/dashboard${toQuery(params)}`, options),
  listAdminUsers: (params: { search?: string; limit?: number; cursor?: string }, options?: EndpointOptions) =>
    request<{
      users: User[];
      nextCursor: string | null;
      hasNextPage: boolean;
    }>(`/admin/users${toQuery(params)}`, options),
  getAdminUserDetail: (userId: string, options?: EndpointOptions) =>
    request<any>(`/admin/users/${userId}`, options),
  updateUserStatus: (userId: string, body: { status: "ACTIVE" | "INACTIVE" | "BANNED" }) =>
    request<{ id: string; username: string; status: string }>(`/admin/users/${userId}/status`, {
      method: "PATCH",
      body,
    }),
  assignPlatformAdmin: (userId: string) =>
    request<{ message: string }>(`/admin/users/${userId}/platform-admin`, {
      method: "POST",
    }),
  removePlatformAdmin: (userId: string) =>
    request<{ message: string }>(`/admin/users/${userId}/platform-admin`, {
      method: "DELETE",
    }),
  assignCollegeAdmin: (collegeId: string, body: { userId: string }) =>
    request<{ message: string; assignment: any }>(`/admin/colleges/${collegeId}/admins`, {
      method: "POST",
      body,
    }),
  removeCollegeAdmin: (collegeId: string, userId: string) =>
    request<{ message: string }>(`/admin/colleges/${collegeId}/admins/${userId}`, {
      method: "DELETE",
    }),
  listCollegeAdmins: (collegeId: string, options?: EndpointOptions) =>
    request<any[]>(`/admin/colleges/${collegeId}/admins`, options),
  assignCompanyAdmin: (companyId: string, body: { userId: string; officeCity?: string }) =>
    request<{ message: string; assignment: any }>(`/admin/companies/${companyId}/admins`, {
      method: "POST",
      body,
    }),
  removeCompanyAdmin: (companyId: string, userId: string, officeCity?: string) =>
    request<{ message: string }>(`/admin/companies/${companyId}/admins/${userId}${officeCity ? `?officeCity=${encodeURIComponent(officeCity)}` : ""}`, {
      method: "DELETE",
    }),
  listCompanyAdmins: (companyId: string, options?: EndpointOptions) =>
    request<any[]>(`/admin/companies/${companyId}/admins`, options),
  // Company Admin Dashboard
  getCompanyAdminStats: (companyId: string, options?: EndpointOptions) =>
    request<any>(`/companies/${companyId}/admin-dashboard/stats`, options),
  listCompanyAdminsForDashboard: (companyId: string, options?: EndpointOptions) =>
    request<any[]>(`/companies/${companyId}/admin-dashboard/admins`, options),
  assignCompanyAdminFromDashboard: (companyId: string, body: { userId: string; officeCity?: string }) =>
    request<{ message: string; assignment: any }>(`/companies/${companyId}/admin-dashboard/admins`, {
      method: "POST",
      body,
    }),
  removeCompanyAdminFromDashboard: (companyId: string, userId: string, officeCity?: string) =>
    request<{ message: string }>(`/companies/${companyId}/admin-dashboard/admins/${userId}${officeCity ? `?officeCity=${encodeURIComponent(officeCity)}` : ""}`, {
      method: "DELETE",
    }),
  listCompanyRecruiters: (companyId: string, options?: EndpointOptions) =>
    request<any[]>(`/companies/${companyId}/admin-dashboard/recruiters`, options),
  assignCompanyRecruiter: (companyId: string, body: { userId: string; title?: string }) =>
    request<{ message: string }>(`/companies/${companyId}/admin-dashboard/recruiters`, {
      method: "POST",
      body,
    }),
  removeCompanyRecruiter: (companyId: string, userId: string) =>
    request<{ message: string }>(`/companies/${companyId}/admin-dashboard/recruiters/${userId}`, {
      method: "DELETE",
    }),
  // Content Moderation
  adminListPosts: (params: { q?: string; limit?: number; cursor?: string }, options?: EndpointOptions) =>
    request<{ posts: any[]; nextCursor: string | null; hasNextPage: boolean }>(`/admin/content/posts${toQuery(params)}`, options),
  adminDeletePost: (postId: string) =>
    request<{ message: string }>(`/admin/content/posts/${postId}`, { method: "DELETE" }),
  adminListHackathons: (params: { q?: string; limit?: number; cursor?: string }, options?: EndpointOptions) =>
    request<{ hackathons: any[]; nextCursor: string | null; hasNextPage: boolean }>(`/admin/content/hackathons${toQuery(params)}`, options),
  adminUpdateHackathonStatus: (hackathonId: string, body: { status: string }) =>
    request<any>(`/admin/content/hackathons/${hackathonId}/status`, { method: "PATCH", body }),
  adminUpdateHackathon: (hackathonId: string, body: any) =>
    request<any>(`/admin/content/hackathons/${hackathonId}`, { method: "PATCH", body }),
  adminTriggerScraper: (options?: EndpointOptions) =>
    request<any>(`/admin/scraper/run`, { method: "POST", ...options }),
  adminTriggerJobScraper: (options?: EndpointOptions) =>
    request<any>(`/admin/scraper/jobs`, { method: "POST", ...options }),
  adminTriggerCompanyDiscovery: (options?: EndpointOptions) =>
    request<any>(`/admin/scraper/companies-discovery`, { method: "POST", ...options }),

  adminListProjects: (params: { q?: string; limit?: number; cursor?: string }, options?: EndpointOptions) =>
    request<{ projects: any[]; nextCursor: string | null; hasNextPage: boolean }>(`/admin/content/projects${toQuery(params)}`, options),
  adminUpdateProjectStatus: (projectId: string, body: { status: string }) =>
    request<any>(`/admin/content/projects/${projectId}/status`, { method: "PATCH", body }),
  adminListJobs: (params: { q?: string; limit?: number; cursor?: string }, options?: EndpointOptions) =>
    request<{ jobs: any[]; nextCursor: string | null; hasNextPage: boolean }>(`/admin/content/jobs${toQuery(params)}`, options),
  adminCreateJob: (body: any) =>
    request<any>("/admin/content/jobs", { method: "POST", body }),
  adminUpdateJob: (jobId: string, body: any) =>
    request<any>(`/admin/content/jobs/${jobId}`, { method: "PATCH", body }),
  adminDeleteJob: (jobId: string) =>
    request<{ message: string }>(`/admin/content/jobs/${jobId}`, { method: "DELETE" }),
  adminListCommunities: (params: { q?: string; limit?: number; cursor?: string }, options?: EndpointOptions) =>
    request<{ communities: any[]; nextCursor: string | null; hasNextPage: boolean }>(`/admin/content/communities${toQuery(params)}`, options),
  adminUpdateCommunity: (communityId: string, body: { archived?: boolean; verified?: boolean }) =>
    request<any>(`/admin/content/communities/${communityId}`, { method: "PATCH", body }),
  adminListReferrals: (params: { q?: string; limit?: number; cursor?: string }, options?: EndpointOptions) =>
    request<{ referrals: any[]; nextCursor: string | null; hasNextPage: boolean }>(`/admin/content/referrals${toQuery(params)}`, options),
  adminListEvents: (params?: { collegeId?: string; companyId?: string; communityId?: string; type?: string; page?: number; limit?: number }, options?: EndpointOptions) =>
    request<Event[]>(`/admin/events${toQuery(params || {})}`, options),
  adminListEventAttendees: (eventId: string, params?: { page?: number; limit?: number }, options?: EndpointOptions) =>
    request<any>(`/admin/events/${eventId}/attendees${toQuery(params || {})}`, options),
  adminUpdateEvent: (eventId: string, body: any) =>
    request<Event>(`/admin/events/${eventId}`, { method: "PUT", body }),
  adminDeleteEvent: (eventId: string) =>
    request<any>(`/admin/events/${eventId}`, { method: "DELETE" }),
  // Department Management
  adminCreateDepartment: (collegeId: string, body: { name: string; hod?: string }) =>
    request<any>(`/admin/colleges/${collegeId}/departments`, { method: "POST", body }),
  adminListDepartments: (collegeId: string, options?: EndpointOptions) =>
    request<any[]>(`/admin/colleges/${collegeId}/departments`, options),

  myProjects: (options?: EndpointOptions) =>
    request<Project[]>("/users/me/projects", options),
  searchSkills: (q: string, options?: EndpointOptions) =>
    request<Skill[]>(
      `/users/skills/search${toQuery({ q, limit: 12 })}`,
      options,
    ),
  createCustomSkill: (name: string) =>
    request<Skill>("/users/skills/create-custom", { method: "POST", body: { name } }),

  searchColleges: (q: string) =>
    request<College[]>(`/colleges/search${toQuery({ q })}`),
  college: (collegeId: string, options?: EndpointOptions) =>
    request<College>(`/colleges/${collegeId}`, options),
  colleges: (limit = 50, options?: CursorOptions) => {
    const { cursor, ...requestOptions } = options || {};
    return request<CollegePage>(
      `/colleges${toQuery({ limit, cursor })}`,
      requestOptions,
    );
  },
  createCollege: (body: CollegeMutationPayload) =>
    request<College>("/colleges", { method: "POST", body }),
  deleteCollege: (collegeId: string) =>
    request<{ message: string }>(`/colleges/${collegeId}`, { method: "DELETE" }),
  collegePlacementSummary: (collegeId: string, options?: EndpointOptions) =>
    request<CollegePlacementSummary>(`/colleges/${collegeId}/placement-summary`, options),
  createDepartment: (body: DepartmentMutationPayload) =>
    request<Department>("/colleges/departments", { method: "POST", body }),
  departments: (collegeId: string, options?: EndpointOptions) =>
    request<Department[]>(`/colleges/${collegeId}/departments`, options),
  standardDepartments: (options?: EndpointOptions) =>
    request<StandardDepartment[]>("/colleges/standard-departments", options),
  companies: (
    params: {
      page?: number;
      limit?: number;
      q?: string;
      industry?: string;
      location?: string;
      type?: CompanyType;
      size?: CompanySize;
      verified?: boolean;
      hiringEnabled?: boolean;
      hasJobs?: boolean;
    } = {},
    options?: EndpointOptions,
  ) => request<CompanyPage>(`/companies${toQuery(params)}`, options),
  company: (slug: string, options?: EndpointOptions) =>
    request<Company>(`/companies/${slug}`, options),
  createCompany: (body: CompanyMutationPayload) =>
    request<Company>("/companies", { method: "POST", body }),
  discoveredCompanies: (params: { page?: number; limit?: number } = {}, options?: EndpointOptions) =>
    request<any>(`/companies/discovered${toQuery(params)}`, options),
  reviewDiscoveredCompanies: (body: { companyIds: string[]; action: "VERIFY" | "REJECT" }) =>
    request<{ processed: number; action: string }>("/companies/discovered/review", { method: "POST", body }),
  companyEmployees: (
    companyId: string,
    page = 1,
    limit = 20,
    options?: EndpointOptions,
  ) =>
    request<CompanyEmployeesPage>(
      `/companies/${companyId}/employees${toQuery({ page, limit })}`,
      options,
    ),
  createCommunity: (body: CommunityMutationPayload) =>
    request<Community>("/communities", { method: "POST", body }),
  community: (slug: string, options?: EndpointOptions) =>
    request<Community>(`/communities/${slug}`, options),
  archiveCommunity: (communityId: string) =>
    request<{ success: boolean }>(`/communities/${communityId}/archive`, {
      method: "PATCH",
    }),
  conversations: (options?: EndpointOptions) =>
    request<Conversation[]>("/chat", options),
  createDirectConversation: (userId: string) =>
    request<Conversation>("/chat/direct", { method: "POST", body: { userId } }),
  createGroupConversation: (body: CreateGroupConversationPayload) =>
    request<Conversation>("/chat/group", { method: "POST", body }),
  conversationMessages: (conversationId: string, options?: CursorOptions) => {
    const { cursor, ...requestOptions } = options || {};
    return request<ChatMessagesPage>(
      `/chat/${conversationId}/messages${toQuery({ cursor })}`,
      requestOptions,
    );
  },
  sendMessage: (conversationId: string, body: SendMessagePayload) =>
    request<ChatMessage>(`/chat/${conversationId}/messages`, {
      method: "POST",
      body,
    }),
  uploadChatAttachments: (
    conversationId: string,
    attachments: ChatAttachment[],
  ) =>
    request<{ attachments: ChatAttachment[] }>(
      `/chat/${conversationId}/attachments`,
      {
        method: "POST",
        body: { attachments },
      },
    ),
  markConversationRead: (conversationId: string) =>
    request<{
      success: boolean;
      conversationId: string;
      userId: string;
      readAt: string;
      messageIds: string[];
    }>(`/chat/${conversationId}/read`, { method: "PATCH" }),
  addConversationParticipant: (conversationId: string, userId: string) =>
    request<ConversationParticipant>(`/chat/${conversationId}/participants`, {
      method: "POST",
      body: { userId },
    }),
  removeConversationParticipant: (conversationId: string, userId: string) =>
    request<{ success: boolean }>(
      `/chat/${conversationId}/participants/${userId}`,
      {
        method: "DELETE",
      },
    ),
  forwardMessage: (messageId: string, targetConversationId: string) =>
    request<ChatMessage>("/chat/message/forward", {
      method: "POST",
      body: { messageId, targetConversationId },
    }),
  reactToMessage: (messageId: string, emoji: string) =>
    request<{ reacted: boolean }>(`/chat/message/${messageId}/react`, {
      method: "POST",
      body: { emoji },
    }),
  editMessage: (messageId: string, content: string) =>
    request<ChatMessage>(`/chat/message/${messageId}/edit`, {
      method: "PATCH",
      body: { content },
    }),
  deleteMessage: (messageId: string) =>
    request<ChatMessage>(`/chat/message/${messageId}`, { method: "DELETE" }),
  searchMessages: (
    conversationId: string,
    q: string,
    options?: EndpointOptions,
  ) =>
    request<ChatMessage[]>(
      `/chat/conversation/${conversationId}/search${toQuery({ q })}`,
      options,
    ),
  togglePinConversation: (conversationId: string) =>
    request<ConversationParticipant>(
      `/chat/conversation/${conversationId}/pin`,
      {
        method: "PATCH",
      },
    ),
  toggleMuteConversation: (conversationId: string, muted?: boolean) =>
    request<ConversationParticipant>(
      `/chat/conversation/${conversationId}/mute`,
      {
        method: "PATCH",
        body: { muted },
      },
    ),
  toggleArchiveConversation: (conversationId: string) =>
    request<ConversationParticipant>(
      `/chat/conversation/${conversationId}/archive`,
      {
        method: "PATCH",
      },
    ),
  deleteConversation: (conversationId: string) =>
    request<ConversationParticipant>(`/chat/${conversationId}`, {
      method: "DELETE",
    }),
  getArchivedConversations: (options?: EndpointOptions) =>
    request<Conversation[]>(`/chat/archived`, options),
  publicPosts: (limit = 12, options?: EndpointOptions) =>
    request<FeedPage>(`/posts/feed${toQuery({ limit })}`, options),
  personalizedFeed: (limit = 12, options?: EndpointOptions) =>
    request<{ items: FeedItem[]; nextCursor: string | null; hasMore: boolean }>(`/feed${toQuery({ limit })}`, options),
  createPost: (body: {
    content: string;
    type: string;
    tags?: string[];
    visibility?: string;
    communityId?: string;
    mediaUrl?: string;
    collegeId?: string;
    departmentId?: string;
  }) =>
    request<FeedPost>("/posts", { method: "POST", body }),
  post: (
    id: string,
    params: { commentsLimit?: number; repliesLimit?: number } = {},
    options?: EndpointOptions,
  ) => request<FeedPost>(`/posts/${id}${toQuery(params)}`, options),
  updatePost: (
    id: string,
    body: { title?: string; content?: string; type?: string; tags?: string[] },
  ) => request<FeedPost>(`/posts/${id}`, { method: "PATCH", body }),
  deletePost: (id: string) =>
    request<{ success: boolean }>(`/posts/${id}`, { method: "DELETE" }),
  commentOnPost: (
    id: string,
    body: { content: string; parentCommentId?: string },
  ) =>
    request<unknown>(`/posts/${id}/comments`, { method: "POST", body }),
  likePost: (id: string) =>
    request<{ liked?: boolean }>(`/posts/${id}/like`, { method: "POST" }),
  savePost: (id: string) =>
    request<{ saved?: boolean }>(`/posts/${id}/save`, { method: "POST" }),
  repostPost: (id: string, body?: { caption?: string }) =>
    request<unknown>(`/posts/${id}/repost`, { method: "POST", body }),
  deleteComment: (commentId: string) =>
    request<{ success: boolean }>(`/posts/comments/${commentId}`, {
      method: "DELETE",
    }),
  userTimeline: (userId: string, options?: EndpointOptions) =>
    request<FeedItem[]>(`/posts/user/${userId}`, options),
  projects: (limit = 12, options?: EndpointOptions) =>
    request<Project[]>(`/projects${toQuery({ limit })}`, options),
  project: (idOrSlug: string, options?: EndpointOptions) =>
    request<Project>(`/projects/${idOrSlug}`, options),
  recommendedProjects: (options?: EndpointOptions) =>
    request<Project[]>("/recommendations/projects", options),
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
    request<ProjectJoinRequest>(`/projects/${id}/join`, {
      method: "POST",
      body: { message },
    }),
  projectJoinRequests: (id: string, options?: EndpointOptions) =>
    request<ProjectJoinRequest[]>(`/projects/${id}/requests`, options),
  reviewProjectJoinRequest: (
    requestId: string,
    status: "ACCEPTED" | "REJECTED",
  ) =>
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
    request<{ success: boolean }>(`/projects/${projectId}/leave`, {
      method: "DELETE",
    }),
  removeProjectMember: (projectId: string, memberId: string) =>
    request<{ success: boolean }>(
      `/projects/${projectId}/members/${memberId}`,
      {
        method: "DELETE",
      },
    ),
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
  myTeams: (options?: EndpointOptions) => request<Team[]>("/teams/me", options),
  team: (teamId: string, options?: EndpointOptions) =>
    request<Team>(`/teams/${teamId}`, options),
  createTeam: (body: {
    name: string;
    description?: string;
    members?: string[];
  }) => request<Team>("/teams", { method: "POST", body }),
  inviteTeamMember: (teamId: string, invitedUserId: string, message?: string) =>
    request<TeamInvite>(`/teams/${teamId}/invite`, {
      method: "POST",
      body: { invitedUserId, message },
    }),
  reviewTeamInvite: (inviteId: string, status: "ACCEPTED" | "REJECTED") =>
    request<TeamInvite>(`/teams/invites/${inviteId}/review`, {
      method: "PATCH",
      body: { status },
    }),
  withdrawTeamInvite: (inviteId: string) =>
    request<TeamInvite>(`/teams/invites/${inviteId}/withdraw`, {
      method: "PATCH",
    }),
  removeTeamMember: (teamId: string, memberUserId: string) =>
    request<{ success: boolean }>(`/teams/${teamId}/members/${memberUserId}`, {
      method: "DELETE",
    }),
  leaveTeam: (teamId: string) =>
    request<{ success: boolean }>(`/teams/${teamId}/leave`, {
      method: "DELETE",
    }),
  deleteTeam: (teamId: string) =>
    request<Team>(`/teams/${teamId}/delete`, { method: "DELETE" }),
  archiveTeam: (teamId: string) =>
    request<Team>(`/teams/${teamId}/archive`, { method: "PATCH" }),
  restoreTeam: (teamId: string) =>
    request<Team>(`/teams/${teamId}/restore`, { method: "PATCH" }),
  updateTeam: (teamId: string, body: { name?: string; description?: string }) =>
    request<Team>(`/teams/${teamId}/update`, { method: "PATCH", body }),
  promoteMember: (teamId: string, memberUserId: string, role: "MEMBER" | "ADMIN") =>
    request<{ id: string; role: string }>(`/teams/${teamId}/members/${memberUserId}/role`, {
      method: "PATCH",
      body: { role },
    }),
  myPendingTeamInvites: (options?: EndpointOptions) =>
    request<TeamInvite[]>("/teams/invites/pending", options),
  followUser: (userId: string) =>
    request<SocialFollow>(`/social/follow/${userId}`, { method: "POST" }),
  unfollowUser: (userId: string) =>
    request<{ success: boolean }>(`/social/follow/${userId}`, {
      method: "DELETE",
    }),
  connectUser: (userId: string) =>
    request<SocialConnection>(`/social/connect/${userId}`, { method: "POST" }),
  reviewConnection: (connectionId: string, status: "ACCEPTED" | "REJECTED") =>
    request<SocialConnection>(`/social/connections/${connectionId}/review`, {
      method: "PATCH",
      body: { status },
    }),
  followers: (userId: string, limit = 20, options?: CursorOptions) => {
    const { cursor, ...requestOptions } = options || {};
    return request<FollowersPage>(
      `/social/followers/${userId}${toQuery({ limit, cursor })}`,
      requestOptions,
    );
  },
  following: (userId: string, limit = 20, options?: CursorOptions) => {
    const { cursor, ...requestOptions } = options || {};
    return request<FollowingPage>(
      `/social/following/${userId}${toQuery({ limit, cursor })}`,
      requestOptions,
    );
  },
  connections: (userId: string, limit = 20, options?: CursorOptions) => {
    const { cursor, ...requestOptions } = options || {};
    return request<ConnectionsPage>(
      `/social/connections/${userId}${toQuery({ limit, cursor })}`,
      requestOptions,
    );
  },
  suggestedConnections: (limit = 20, options?: CursorOptions) => {
    const { cursor, ...requestOptions } = options || {};
    return request<SuggestedConnectionsPage>(
      `/social/suggested${toQuery({ limit, cursor })}`,
      requestOptions,
    );
  },
  mutualConnections: (userId: string, limit = 20, options?: CursorOptions) => {
    const { cursor, ...requestOptions } = options || {};
    return request<MutualConnectionsPage>(
      `/social/mutual/${userId}${toQuery({ limit, cursor })}`,
      requestOptions,
    );
  },
  hackathons: (
    params?: { status?: string; isExternal?: boolean; q?: string },
    options?: EndpointOptions,
  ) => request<Hackathon[]>(`/hackathons${toQuery(params || {})}`, options),
  hackathon: (id: string, options?: EndpointOptions) =>
    request<Hackathon>(`/hackathons/${id}`, options),
  createHackathon: (body: HackathonMutationPayload) =>
    request<Hackathon>("/hackathons", { method: "POST", body }),
  registerHackathonTeam: (hackathonId: string, teamId: string) =>
    request<HackathonRegistration>(`/hackathons/${hackathonId}/register`, {
      method: "POST",
      body: { teamId },
    }),
  submitHackathonProject: (
    hackathonId: string,
    body: HackathonSubmissionPayload,
  ) =>
    request<HackathonSubmission>(`/hackathons/${hackathonId}/submit`, {
      method: "POST",
      body,
    }),
  reviewHackathonRegistration: (
    registrationId: string,
    status: "APPROVED" | "REJECTED",
  ) =>
    request<HackathonRegistration>(
      `/hackathons/registrations/${registrationId}/review`,
      {
        method: "PATCH",
        body: { status },
      },
    ),
  assignHackathonJudge: (hackathonId: string, userId: string) =>
    request<HackathonJudge>(`/hackathons/${hackathonId}/judges`, {
      method: "POST",
      body: { userId },
    }),
  evaluateHackathonSubmission: (
    submissionId: string,
    body: HackathonEvaluationPayload,
  ) =>
    request<unknown>(`/hackathons/submissions/${submissionId}/evaluate`, {
      method: "POST",
      body,
    }),
  declareHackathonWinners: (hackathonId: string) =>
    request<{ success: boolean; winnersDeclared: number }>(
      `/hackathons/${hackathonId}/declare-winners`,
      { method: "POST" },
    ),
  hackathonLeaderboard: (hackathonId: string, options?: EndpointOptions) =>
    request<HackathonLeaderboard>(
      `/hackathons/${hackathonId}/leaderboard`,
      options,
    ),
  archiveHackathon: (hackathonId: string) =>
    request<Hackathon>(`/hackathons/${hackathonId}/archive`, {
      method: "PATCH",
    }),
  deleteHackathon: (hackathonId: string) =>
    request<Hackathon>(`/hackathons/${hackathonId}`, { method: "DELETE" }),

  searchGlobal: (q: string, omni = false, options?: EndpointOptions) =>
    request<SearchResults>(`/search/global${toQuery({ q, ...(omni && { omni: "true" }) })}`, options),
  searchUsers: (params: { q?: string; collegeIds?: string; collegeName?: string; departmentIds?: string; graduationYears?: string; skills?: string; role?: string; openToWork?: boolean; acceptingReferrals?: boolean; verifiedSkillsOnly?: boolean; limit?: number }, options?: EndpointOptions) =>
    request<User[]>(`/search/users${toQuery({ ...params, limit: params.limit || 20 })}`, options),
  searchProjects: (params: { q?: string; techStack?: string; status?: string; lookingForCollaborators?: boolean; limit?: number }, options?: EndpointOptions) =>
    request<Project[]>(`/search/projects${toQuery({ ...params, limit: params.limit || 12 })}`, options),
  searchHackathons: (params: { q?: string; tags?: string; upcomingOnly?: boolean; limit?: number }, options?: EndpointOptions) =>
    request<Hackathon[]>(`/search/hackathons${toQuery({ ...params, limit: params.limit || 12 })}`, options),
  searchCompanies: (params: { q?: string; industry?: string; size?: string; location?: string; hiringEnabled?: string; referralEnabled?: string; limit?: number }, options?: EndpointOptions) =>
    request<Company[]>(`/search/companies${toQuery({ ...params, limit: params.limit || 20 })}`, options),
  searchCommunities: (params: { q?: string; type?: string; category?: string; limit?: number }, options?: EndpointOptions) =>
    request<Community[]>(`/search/communities${toQuery({ ...params, limit: params.limit || 20 })}`, options),

  trackFeedImpression: (body: {
    entityId: string;
    entityType: FeedItemType;
    position?: number;
    clicked?: boolean;
    hidden?: boolean;
  }) =>
    request<{ success: boolean }>("/feed/impressions", {
      method: "POST",
      body,
    }),
  notifications: (page = 1, limit = 20, options?: EndpointOptions) =>
    request<NotificationsPage>(
      `/notifications${toQuery({ page, limit })}`,
      options,
    ),
  markNotificationRead: (id: string) =>
    request<null>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () =>
    request<null>("/notifications/read-all", { method: "PATCH" }),
  archiveNotification: (id: string) =>
    request<null>(`/notifications/${id}/archive`, { method: "PATCH" }),
  deleteNotification: (id: string) =>
    request<null>(`/notifications/${id}`, { method: "DELETE" }),
  reputationLeaderboard: (options?: EndpointOptions) =>
    request<ReputationSummary[]>("/reputation/leaderboard", options),
  myReputation: (options?: EndpointOptions) =>
    request<ReputationSummary>("/reputation/me", options),
  userReputation: (username: string, options?: EndpointOptions) =>
    request<ReputationSummary>(`/reputation/users/${username}`, options),
  myReputationHistory: (options?: EndpointOptions) =>
    request<ReputationHistoryItem[]>("/reputation/me/history", options),
  badges: (options?: EndpointOptions) =>
    request<Badge[]>("/reputation/badges", options),
  topBadges: (options?: EndpointOptions) =>
    request<Badge[]>("/reputation/top-badges", options),
  topEngineers: (options?: EndpointOptions) =>
    request<LeaderboardResult<User>>("/leaderboards/engineers", options),
  topProjects: (options?: EndpointOptions) =>
    request<LeaderboardResult<Project>>("/leaderboards/projects", options),
  topHackathonEngineers: (options?: EndpointOptions) =>
    request<LeaderboardResult<User>>(
      "/leaderboards/hackathon-engineers",
      options,
    ),
  topTeams: (options?: EndpointOptions) =>
    request<LeaderboardResult<Team>>("/leaderboards/teams", options),
  fastestGrowingEngineers: (options?: EndpointOptions) =>
    request<LeaderboardResult<User>>("/leaderboards/fastest-growing", options),
  recruiterDashboard: (options?: EndpointOptions) =>
    request<RecruiterDashboard>("/recruiter/dashboard", options),
  recruiterJobPipeline: (jobId: string, options?: EndpointOptions) =>
    request<RecruiterJobPipeline>(`/recruiter/jobs/${jobId}/pipeline`, options),
  rankJobCandidates: (jobId: string, options?: EndpointOptions) =>
    request<CandidateRanking[]>(`/analytics/jobs/${jobId}/rankings`, options),
  recruiterInsights: (options?: EndpointOptions) =>
    request<RecruiterInsights>("/analytics/recruiter-insights", options),
  engineeringPortfolio: (username: string, options?: EndpointOptions) =>
    request<EngineeringPortfolio>(`/engineering/portfolio/${username}`, options),
  myActivityTimeline: (limit = 20, options?: CursorOptions) => {
    const { cursor, ...requestOptions } = options || {};
    return request<ActivityPage>(
      `/activities/me${toQuery({ limit, cursor })}`,
      requestOptions,
    );
  },
  trackInteraction: (body: InteractionPayload) =>
    request<{ success?: boolean }>("/interactions/track", {
      method: "POST",
      body,
    }),
  rebuildAffinities: () =>
    request<{ success?: boolean }>("/affinity/rebuild", { method: "POST" }),
  trendingFeed: (limit = 100, options?: EndpointOptions) =>
    request<TrendingFeedItem[]>(
      `/trending/feed${toQuery({ limit })}`,
      options,
    ),
  trackTrendingImpression: (body: InteractionPayload) =>
    request<{ success: boolean }>("/trending/impressions", {
      method: "POST",
      body,
    }),
  refreshTrending: () =>
    request<{ success?: boolean }>("/trending/refresh", { method: "POST" }),

  // Discovery & Recommendations
  discoveryFeed: (options?: EndpointOptions) =>
    request<FeedItem[]>("/discovery/feed", options),
  suggestedEngineers: (limit = 20, options?: EndpointOptions) =>
    request<User[]>(
      `/discovery/suggested-engineers${toQuery({ limit })}`,
      options,
    ),
  suggestedMentors: (limit = 20, options?: EndpointOptions) =>
    request<User[]>(
      `/discovery/suggested-mentors${toQuery({ limit })}`,
      options,
    ),
  suggestedRecruiters: (limit = 20, options?: EndpointOptions) =>
    request<User[]>(
      `/discovery/suggested-recruiters${toQuery({ limit })}`,
      options,
    ),
  suggestedCollaborators: (limit = 20, options?: EndpointOptions) =>
    request<User[]>(
      `/discovery/suggested-collaborators${toQuery({ limit })}`,
      options,
    ),
  suggestedTeammates: (limit = 20, options?: EndpointOptions) =>
    request<User[]>(
      `/discovery/suggested-teammates${toQuery({ limit })}`,
      options,
    ),
  complementaryTeammates: (limit = 10, options?: EndpointOptions) =>
    request<{ userCategory: string; matches: { id: string; username: string | null; fullName: string | null; avatar: string | null; headline: string | null; dominantCategory: string; matchedSkills: string[]; engineeringScore: number }[] }>(
      `/matchmaking/teammates${toQuery({ limit })}`,
      options,
    ),
  suggestedProjects: (limit = 20, options?: EndpointOptions) =>
    request<Project[]>(
      `/discovery/suggested-projects${toQuery({ limit })}`,
      options,
    ),
  suggestedJobs: (limit = 20, options?: EndpointOptions) =>
    request<Job[]>(`/discovery/suggested-jobs${toQuery({ limit })}`, options),
  suggestedHackathons: (limit = 20, options?: EndpointOptions) =>
    request<Hackathon[]>(
      `/discovery/suggested-hackathons${toQuery({ limit })}`,
      options,
    ),
  suggestedCompanies: (limit = 20, options?: EndpointOptions) =>
    request<Company[]>(
      `/discovery/suggested-companies${toQuery({ limit })}`,
      options,
    ),
  suggestedPosts: (limit = 20, options?: EndpointOptions) =>
    request<FeedPost[]>(
      `/discovery/suggested-posts${toQuery({ limit })}`,
      options,
    ),
  suggestedCommunities: (limit = 20, options?: EndpointOptions) =>
    request<Community[]>(
      `/discovery/suggested-communities${toQuery({ limit })}`,
      options,
    ),
  trendingCommunities: (options?: EndpointOptions) =>
    request<Community[]>("/discovery/suggested-communities", options),
  communityBySlug: (
    slug: string,
    page = 1,
    limit = 10,
    options?: EndpointOptions,
  ) =>
    request<Community>(
      `/communities/${slug}${toQuery({ page, limit })}`,
      options,
    ),
  joinedCommunities: (options?: EndpointOptions) =>
    request<Community[]>("/communities/me/joined", options),
  joinCommunity: (communityId: string) =>
    request<{ success: boolean }>(`/communities/${communityId}/join`, {
      method: "POST",
    }),
  leaveCommunity: (communityId: string) =>
    request<{ success: boolean }>(`/communities/${communityId}/leave`, {
      method: "POST",
    }),
  getCommunityJoinRequests: (slug: string) =>
    request<any[]>(`/communities/${slug}/join-requests`),
  reviewCommunityJoinRequest: (slug: string, pendingUserId: string, action: "approve" | "reject") =>
    request<{ success: boolean; status: string }>(`/communities/${slug}/join-requests/${pendingUserId}`, {
      method: "PATCH",
      body: { action },
    }),
  trackRecommendationImpression: (body: {
    entityId: string;
    entityType: string;
    position?: number;
    clicked?: boolean;
    hidden?: boolean;
  }) =>
    request<{ success: boolean }>("/trending/impressions", {
      method: "POST",
      body,
    }),

  // Admin: Company Requests
  adminCompanyRequests: (status?: string, options?: EndpointOptions) =>
    request<CompanyRequest[]>(`/admin/company-requests${status ? `?status=${status}` : ""}`, options),
  adminApproveCompanyRequest: (requestId: string, body?: { logoUrl?: string; websiteUrl?: string; headquarters?: string; industry?: string }) =>
    request<{ success: boolean; company: any; job: any }>(`/admin/company-requests/${requestId}/approve`, { method: "POST", body: body || {} }),
  adminRejectCompanyRequest: (requestId: string, reviewNotes?: string) =>
    request<{ success: boolean }>(`/admin/company-requests/${requestId}/reject`, { method: "POST", body: { reviewNotes } }),

  // Companies Follow/Request
  requestCompanyRegistration: (body: any) =>
    request<any>("/companies/request", { method: "POST", body }),
  followCompany: (companyId: string) =>
    request<any>(`/companies/${companyId}/follow`, { method: "POST" }),
  unfollowCompany: (companyId: string) =>
    request<any>(`/companies/${companyId}/unfollow`, { method: "POST" }),

  // College import, email verification, events & RSVPs
  importColleges: (body: any, options?: EndpointOptions) =>
    request<College[]>("/colleges/import", { method: "POST", body, ...options }),
  verifyCollegeEmail: (educationId: string, email: string, code?: string) =>
    request<any>(`/users/me/educations/${educationId}/verify`, { method: "POST", body: { email, code } }),
  verifyWorkEmail: (experienceId: string, email: string, code?: string) =>
    request<any>(`/users/me/experiences/${experienceId}/verify`, { method: "POST", body: { email, code } }),
  events: (params?: { collegeId?: string; companyId?: string; communityId?: string; type?: string }, options?: EndpointOptions) =>
    request<Event[]>(`/events${toQuery(params || {})}`, options),
  event: (id: string, options?: EndpointOptions) =>
    request<Event>(`/events/${id}`, options),
  createEvent: (body: any) =>
    request<Event>("/events", { method: "POST", body }),
  updateEvent: (id: string, body: any) =>
    request<Event>(`/events/${id}`, { method: "PUT", body }),
  deleteEvent: (id: string) =>
    request<any>(`/events/${id}`, { method: "DELETE" }),
  rsvpEvent: (id: string, status: RSVPStatus) =>
    request<any>(`/events/${id}/rsvp`, { method: "POST", body: { status } }),

  // External Job Application Tracking
  createExternalApplication: (body: {
    jobId?: string;
    jobTitle: string;
    companyName: string;
    companyLogoUrl?: string;
    applyUrl?: string;
    location?: string;
    jobType?: string;
    status?: any; // typed loosely to prevent import cycle
    notes?: string;
    appliedAt?: string;
  }) =>
    request<ExternalJobApplication>("/external-applications", { method: "POST", body }),
  myExternalApplications: (options?: EndpointOptions) =>
    request<ExternalJobApplication[]>("/external-applications/mine", options),
  updateExternalApplicationStatus: (id: string, body: { status: any; notes?: string }) =>
    request<ExternalJobApplication>(`/external-applications/${id}/status`, { method: "PATCH", body }),
  deleteExternalApplication: (id: string) =>
    request<{ success: boolean }>(`/external-applications/${id}`, { method: "DELETE" }),

  // CDCR Management
  listCdcrMembers: (collegeId: string, options?: EndpointOptions) =>
    request<CdcrMember[]>(`/colleges/${collegeId}/tpo/cdcr`, options),
  assignCdcrMember: (collegeId: string, userId: string) =>
    request<CdcrMember>(`/colleges/${collegeId}/tpo/cdcr`, { method: "POST", body: { userId } }),
  removeCdcrMember: (collegeId: string, userId: string) =>
    request<{ success: boolean }>(`/colleges/${collegeId}/tpo/cdcr/${userId}`, { method: "DELETE" }),
  searchCollegeStudents: (collegeId: string, query: string, options?: EndpointOptions) =>
    request<Array<{ id: string; username: string; email: string; profile?: { fullName: string; avatarUrl?: string | null } | null }>>(`/colleges/${collegeId}/tpo/students?q=${encodeURIComponent(query)}`, options),

  // Alumni Verification
  claimAlumniStatus: (collegeId: string) =>
    request<{ id: string; isAlumni: boolean }>(`/colleges/${collegeId}/alumni-claim`, { method: "POST", body: {} }),
  pendingAlumniClaims: (collegeId: string, options?: EndpointOptions) =>
    request<AlumniClaim[]>(`/colleges/${collegeId}/alumni-claims`, options),
  approveAlumniClaim: (collegeId: string, educationId: string) =>
    request<{ id: string; alumniVerified: boolean }>(`/colleges/${collegeId}/alumni-claims/${educationId}/approve`, { method: "POST", body: {} }),
  rejectAlumniClaim: (collegeId: string, educationId: string) =>
    request<{ id: string; isAlumni: boolean }>(`/colleges/${collegeId}/alumni-claims/${educationId}/reject`, { method: "POST", body: {} }),

  // B2B SaaS Enterprise claims & onboarding
  submitCompanyClaim: (companyId: string, body: { gstin: string; cin: string; businessEmail: string; corporateDoc: string }) =>
    request<any>(`/companies/${companyId}/claim`, { method: "POST", body }),
  submitRecruiterOnboarding: (body: { companyId?: string | null; companyName: string; businessEmail: string }) =>
    request<any>("/companies/recruiter-onboarding", { method: "POST", body }),
  createCompanyOffice: (companyId: string, body: { name: string; address?: string; city: string; managerId?: string | null }) =>
    request<any>(`/companies/${companyId}/offices`, { method: "POST", body }),
  createCompanyDepartment: (companyId: string, body: { name: string; code?: string }) =>
    request<any>(`/companies/${companyId}/departments`, { method: "POST", body }),
  adminReviewBusinessRequest: (requestId: string, action: "APPROVE" | "REJECT") =>
    request<any>(`/admin/company-requests/${requestId}/review`, { method: "POST", body: { action } }),
  updateCompany: (companyId: string, body: CompanyMutationPayload) =>
    request<Company>(`/companies/${companyId}`, { method: "PATCH", body }),

  submitTpoOnboarding: (body: {
    collegeName: string;
    city?: string;
    state?: string;
    country?: string;
    website?: string;
    aisheCode?: string;
    officialEmail: string;
    authorityLetterheadDoc?: string;
  }) =>
    request<any>("/tpo/onboard-college", { method: "POST", body }),

  // TPO Claim OTP Flow (2-step: domain verify → OTP → admin queue)
  tpoClaimInitiate: (body: {
    collegeName: string;
    officialEmail: string;
    city?: string;
    state?: string;
    country?: string;
    website?: string;
    aisheCode?: string;
    authorityLetterheadDoc?: string;
  }) =>
    request<{ collegeName: string; officialEmail: string; otpExpiresInSeconds: number; emailSent: boolean; message: string }>(
      "/companies/tpo/claim/initiate",
      { method: "POST", body }
    ),

  tpoClaimVerify: (body: {
    collegeName: string;
    officialEmail: string;
    otp: string;
    city?: string;
    state?: string;
    country?: string;
    website?: string;
    aisheCode?: string;
    authorityLetterheadDoc?: string;
  }) =>
    request<{ collegeRequestId: string; collegeName: string; status: string; officialEmail: string; message: string }>(
      "/companies/tpo/claim/verify",
      { method: "POST", body }
    ),

  // Admin — College Onboarding Requests
  adminGetCollegeRequests: (status?: string, options?: EndpointOptions) =>
    request<any[]>(`/admin/college-requests${status ? `?status=${status}` : ""}`, options),

  adminReviewCollegeRequest: (requestId: string, body: { action: "APPROVE" | "REJECT" | "DUPLICATE"; adminNote?: string }) =>
    request<any>(`/admin/college-requests/${requestId}/review`, { method: "POST", body }),

  adminGetCollegeRequest: (requestId: string, options?: EndpointOptions) =>
    request<any>(`/admin/college-requests/${requestId}`, options),

  // TPO Dashboard
  getTpoDashboardStats: (options?: EndpointOptions) =>
    request<TpoDashboardStats>("/tpo/dashboard/stats", options),

  getTpoStudents: (
    params: {
      page: number;
      limit: number;
      graduationYear?: number;
      departmentId?: string;
      currentYear?: number;
      search?: string;
    },
    options?: EndpointOptions
  ) => {
    let url = `/tpo/dashboard/students?page=${params.page}&limit=${params.limit}`;
    if (params.graduationYear) url += `&graduationYear=${params.graduationYear}`;
    if (params.departmentId) url += `&departmentId=${params.departmentId}`;
    if (params.currentYear) url += `&currentYear=${params.currentYear}`;
    if (params.search) url += `&search=${encodeURIComponent(params.search)}`;
    return request<StudentListPage>(url, options);
  },

  getTpoPlacements: (options?: EndpointOptions) =>
    request<PlacementDrive[]>("/tpo/dashboard/placements", options),

  getTpoAlumniVerifications: (options?: EndpointOptions) =>
    request<AlumniVerificationItem[]>("/tpo/dashboard/alumni", options),

  approveAlumniVerification: (educationId: string) =>
    request<{ educationId: string; approved: boolean }>(
      `/tpo/dashboard/alumni/${educationId}/approve`,
      { method: "PATCH" }
    ),

  rejectAlumniVerification: (educationId: string) =>
    request<{ educationId: string; rejected: boolean }>(
      `/tpo/dashboard/alumni/${educationId}/reject`,
      { method: "PATCH" }
    ),

  getTpoCompanyClaims: (options?: EndpointOptions) =>
    request<CompanyClaimSummary[]>("/tpo/dashboard/company-claims", options),

  getTpoRecruiterInteractions: (options?: EndpointOptions) =>
    request<RecruiterInteraction[]>("/tpo/dashboard/recruiters", options),

  // Recruiter Claim Workspace
  getMyClaimStatus: (options?: EndpointOptions) =>
    request<CompanyRequest[]>("/recruiter/claim/status", options),

  getMyPostedJobs: (options?: EndpointOptions) =>
    request<Job[]>("/recruiter/claim/jobs", options),

  updateJobStatus: (jobId: string, status: "OPEN" | "CLOSED" | "ARCHIVED") =>
    request<{ id: string; title: string; status: string; archivedAt: string | null }>(
      `/recruiter/claim/jobs/${jobId}/status`,
      { method: "PATCH", body: { status } }
    ),

  getJobApplications: (
    jobId: string,
    params?: { page?: number; limit?: number; status?: string },
    options?: EndpointOptions
  ) => {
    let url = `/recruiter/claim/jobs/${jobId}/applications?page=${params?.page ?? 1}&limit=${params?.limit ?? 20}`;
    if (params?.status) url += `&status=${params.status}`;
    return request<{
      applications: JobApplication[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(url, options);
  },

  updateApplicationStatus: (
    jobId: string,
    appId: string,
    body: { status: string; recruiterNotes?: string }
  ) =>
    request<any>(
      `/recruiter/claim/jobs/${jobId}/applications/${appId}/status`,
      { method: "PATCH", body }
    ),

  // ── Interview Module ────────────────────────────────────────────────────
  interviews: (
    params?: {
      page?: number;
      limit?: number;
      roleTag?: string;
      difficulty?: string;
      companyTag?: string;
      roundType?: string;
      formatTag?: string;
      langTag?: string;
      search?: string;
    },
    options?: EndpointOptions
  ) =>
    request<InterviewListPage>(`/interviews${toQuery(params || {})}`, options),

  interview: (id: string, options?: EndpointOptions) =>
    request<InterviewResource>(`/interviews/${id}`, options),

  toggleSaveInterview: (id: string) =>
    request<{ saved: boolean }>(`/interviews/${id}/save`, { method: "POST" }),

  // Admin
  createInterview: (body: any) =>
    request<InterviewResource>("/interviews", { method: "POST", body }),

  updateInterview: (id: string, body: any) =>
    request<InterviewResource>(`/interviews/${id}`, { method: "PUT", body }),

  deleteInterview: (id: string) =>
    request<{ deleted: boolean; id: string }>(`/interviews/${id}`, { method: "DELETE" }),

  triggerInterviewScrape: (options?: EndpointOptions) =>
    request<{ created: number; updated: number }>("/interviews/scrape", { method: "POST", ...options }),

  // TPO Recruiter outreach
  bulkInviteRecruiters: (
    collegeId: string,
    body: { invites: Array<{ email: string; companyName: string }> }
  ) =>
    request<{ sentCount: number; skippedCount: number }>(
      `/colleges/${collegeId}/invites/bulk-recruiters`,
      { method: "POST", body }
    ),

  // Public batch profiles
  getPublicBatchStudents: (
    collegeId: string,
    graduationYear: number,
    options?: EndpointOptions
  ) =>
    request<{ collegeName: string; graduationYear: number; students: any[] }>(
      `/colleges/${collegeId}/public/batch/${graduationYear}`,
      options
    ),

  // Resdex recruiter search
  resdexSearch: (
    body: {
      query?: string;
      skills?: string[];
      minCgpa?: number;
      graduationYear?: number;
      collegeName?: string;
      companyName?: string;
      size?: number;
      from?: number;
    },
    options?: EndpointOptions
  ) =>
    request<{
      total: number;
      candidates: any[];
      searchLimitInfo?: {
        isLimited: boolean;
        dailyLimit: number;
        currentCount: number;
      };
    }>("/resdex/search", { method: "POST", body, ...options }),

  // AI Resume Reviews
  getResumeReviews: (options?: EndpointOptions) =>
    request<any[]>("/resume/reviews", { method: "GET", ...options }),

  triggerResumeReview: (options?: EndpointOptions) =>
    request<any>("/resume/review", { method: "POST", ...options }),

  // AI Mock Interviews
  scheduleInterviewRoom: (body: { resourceId?: string }, options?: EndpointOptions) =>
    request<any>("/interviews/rooms", { method: "POST", body, ...options }),

  getInterviewRooms: (options?: EndpointOptions) =>
    request<any[]>("/interviews/rooms", { method: "GET", ...options }),

  getInterviewRoomDetail: (roomId: string, options?: EndpointOptions) =>
    request<any>(`/interviews/rooms/${roomId}`, { method: "GET", ...options }),

  evaluateInterviewRoom: (roomId: string, body: { transcript: string; answers?: any }, options?: EndpointOptions) =>
    request<any>(`/interviews/rooms/${roomId}/evaluate`, { method: "POST", body, ...options }),
};

export const api = {
  ...authApi,
  ...jobsApi,
  ...storageApi,
  ...remainingApi,
};

// Re-export specific interfaces/types defined locally or at the bottom
export interface TpoDashboardStats {
  totalStudents: number;
  activeDrives: number;
  pendingAlumniVerifications: number;
  recruiterCount: number;
}

export interface StudentListPage {
  students: Array<{
    userId: string;
    fullName: string;
    avatarUrl?: string | null;
    headline?: string | null;
    graduationYear?: number | null;
    department?: { id: string; name: string } | null;
    college?: { id: string; name: string } | null;
    user: {
      id: string;
      username: string;
      reputationScore: number;
      openToWork: boolean;
      openToInternship: boolean;
      educations: Array<{
        endYear: number | null;
        currentYear: number | null;
        cgpa: number | null;
        isAlumni: boolean;
        alumniVerified: boolean;
      }>;
    };
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AlumniVerificationItem {
  id: string;
  endYear?: number | null;
  degree?: string | null;
  fieldOfStudy?: string | null;
  createdAt: string;
  college?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  user: {
    id: string;
    username: string;
    profile?: {
      fullName: string;
      avatarUrl?: string | null;
      headline?: string | null;
    } | null;
  };
}

export type InterviewRoleTag =
  | "SDE_1" | "SDE_2" | "FRONTEND" | "BACKEND" | "FULLSTACK"
  | "DEVOPS" | "DATA_ML" | "MOBILE" | "SYSTEM_DESIGN" | "BEHAVIORAL";

export type InterviewDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type InterviewCompanyTag = "FAANG" | "STARTUP" | "MNC" | "ANY";
export type InterviewRoundType = "CODING" | "SYSTEM_DESIGN" | "HR_BEHAVIORAL" | "APTITUDE";
export type InterviewFormatTag = "MOCK_INTERVIEW" | "QA_ONLY" | "EXPLANATION" | "WHITEBOARD";

export type InterviewResource = {
  id: string;
  title: string;
  sourceUrl: string;
  youtubeId: string;
  channelName?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null;
  roleTag: InterviewRoleTag;
  difficulty: InterviewDifficulty;
  companyTag: InterviewCompanyTag;
  roundType?: InterviewRoundType | null;
  langTags: string[];
  formatTag?: InterviewFormatTag | null;
  isActive: boolean;
  isSaved?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InterviewListPage = {
  data: InterviewResource[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export interface CompanyClaimSummary {
  id: string;
  companyName: string;
  requestType: string;
  status: string;
  businessEmail: string;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    verificationStatus: string;
  } | null;
  requestedBy: {
    id: string;
    username: string;
    profile?: {
      fullName: string;
      avatarUrl?: string | null;
    } | null;
  };
}

export interface RecruiterInteraction {
  id: string;
  officeCity?: string | null;
  company?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    industry?: string | null;
  } | null;
  user: {
    id: string;
    username: string;
    profile?: {
      fullName: string;
      avatarUrl?: string | null;
      headline?: string | null;
    } | null;
  };
}

export interface CompanyRequest {
  id: string;
  companyName: string;
  requestType: string;
  status: string;
  businessEmail: string;
  corporateDoc?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
  requestedBy?: User;
  requestedById?: string;
  pendingJobData?: unknown;
  company?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    verificationStatus: string;
    gstin?: string | null;
    cin?: string | null;
  } | null;
}
