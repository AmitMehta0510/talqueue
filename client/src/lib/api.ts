import { authStorage } from "./storage";

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type RoleName = "STUDENT" | "PROFESSOR" | "PROFESSIONAL" | "RECRUITER";

export type User = {
  id: string;
  email?: string;
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
  normalizedKey?: string;
  createdAt?: string;
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
  createdAt?: string;
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
  workEmailVerified?: boolean;
  techStack?: string[];
  skillsUsed?: string[];
  teamSize?: number | null;
  user?: User;
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

export type CollegeMutationPayload = {
  name: string;
  state?: string;
  city?: string;
  website?: string;
  logoUrl?: string;
};

export type DepartmentMutationPayload = {
  name: string;
  collegeId: string;
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
  authorId?: string;
  title?: string;
  content?: string;
  description?: string;
  type?: string;
  visibility?: string;
  createdAt?: string;
  updatedAt?: string;
  author?: User;
  user?: User;
  tags?: Array<string | { tag?: string }>;
  likesCount?: number;
  commentsCount?: number;
  saveCount?: number;
  shareCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  comments?: PostComment[];
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

export type PostComment = {
  id: string;
  postId: string;
  authorId?: string;
  content?: string;
  attachments?: unknown;
  mentions?: string[];
  parentCommentId?: string | null;
  createdAt?: string;
  editedAt?: string | null;
  author?: User;
  replies?: PostComment[];
  _count?: {
    replies?: number;
  };
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

export type Team = {
  id: string;
  name: string;
  description?: string | null;
  ownerId?: string;
  owner?: User;
  status?: string;
  reputationScore?: number;
  completedProjectsCount?: number;
  hackathonWinsCount?: number;
  members?: Array<{
    id?: string;
    userId: string;
    role?: string;
    joinedAt?: string;
    user?: User;
  }>;
  _count?: {
    members?: number;
  };
  invites?: TeamInvite[];
  createdAt?: string;
  archivedAt?: string | null;
  deletedAt?: string | null;
};

export type TeamInvite = {
  id: string;
  teamId: string;
  invitedUserId: string;
  invitedById: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
  message?: string | null;
  reviewedAt?: string | null;
  withdrawnAt?: string | null;
  createdAt?: string;
  team?: Team;
  invitedUser?: User;
  invitedBy?: User;
};

export type SocialFollow = {
  id: string;
  createdAt?: string;
  follower?: User;
  following?: User;
};

export type SocialConnection = {
  id: string;
  senderId?: string;
  receiverId?: string;
  status?: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt?: string;
  reviewedAt?: string | null;
  sender?: User;
  receiver?: User;
  user?: User;
};

export type SuggestedUser = User & {
  affinityScore?: number;
  interactionCount?: number;
  collaborationScore?: number;
  skillSimilarityScore?: number;
  socialScore?: number;
};

export type FollowersPage = {
  followers: SocialFollow[];
  nextCursor?: string | null;
  hasNextPage?: boolean;
  limit?: number;
};

export type FollowingPage = {
  following: SocialFollow[];
  nextCursor?: string | null;
  hasNextPage?: boolean;
  limit?: number;
};

export type ConnectionsPage = {
  connections: SocialConnection[];
  nextCursor?: string | null;
  hasNextPage?: boolean;
  limit?: number;
};

export type SuggestedConnectionsPage = {
  users: SuggestedUser[];
  nextCursor?: string | null;
  hasNextPage?: boolean;
  limit?: number;
};

export type MutualConnectionsPage = {
  users: User[];
  nextCursor?: string | null;
  hasNextPage?: boolean;
  limit?: number;
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

export type CompanyType =
  | "STARTUP"
  | "PRODUCT_BASED"
  | "SERVICE_BASED"
  | "ENTERPRISE"
  | "MNC"
  | "OTHER";

export type CompanySize = "SOLO" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE";

export type Company = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  githubUrl?: string | null;
  description?: string | null;
  tagline?: string | null;
  headquarters?: string | null;
  industry?: string | null;
  foundedYear?: number | null;
  type?: CompanyType | null;
  size?: CompanySize | null;
  verified?: boolean;
  careersPageUrl?: string | null;
  hiringEnabled?: boolean;
  referralEnabled?: boolean;
  rating?: number | null;
  totalRatings?: number;
  recommendationScore?: number;
  jobs?: Array<
    Pick<
      Job,
      | "id"
      | "title"
      | "slug"
      | "location"
      | "type"
      | "workMode"
      | "experienceLevel"
      | "createdAt"
    >
  >;
  experiences?: Experience[];
  _count?: {
    jobs?: number;
    experiences?: number;
    referralRequests?: number;
  };
  createdAt?: string;
};

export type CompanyPage = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  companies: Company[];
};

export type CompanyEmployee = Pick<
  Experience,
  "id" | "title" | "verified" | "verificationScore" | "teamSize"
> & {
  workEmailVerified?: boolean;
  user?: User;
};

export type CompanyEmployeesPage = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  employees: CompanyEmployee[];
};

export type CompanyMutationPayload = {
  name: string;
  logoUrl?: string;
  coverImageUrl?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  githubUrl?: string;
  careersPageUrl?: string;
  description?: string;
  tagline?: string;
  headquarters?: string;
  industry?: string;
  foundedYear?: number;
  type?: CompanyType;
  size?: CompanySize;
  hiringEnabled?: boolean;
  referralEnabled?: boolean;
};

export type CommunityType = "COLLEGE" | "COMPANY" | "GENERAL";

export type CommunityCategory =
  | "GENERAL"
  | "CODING"
  | "PLACEMENTS"
  | "INTERNSHIPS"
  | "REFERRALS"
  | "INTERVIEWS"
  | "SALARIES"
  | "ANNOUNCEMENTS"
  | "RESOURCES"
  | "EVENTS";

export type CommunityMember = {
  id: string;
  userId: string;
  communityId: string;
  role?: "MEMBER" | "MODERATOR" | "ADMIN" | "OWNER";
  active?: boolean;
  autoJoined?: boolean;
  joinedAt?: string;
  user?: User;
};

export type CommunityConversation = {
  id: string;
  title?: string | null;
  category?: string | null;
  updatedAt?: string;
  public?: boolean;
};

export type Community = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  type: CommunityType;
  category: CommunityCategory;
  visibility?: "PUBLIC" | "PRIVATE" | "RESTRICTED";
  verified?: boolean;
  archived?: boolean;
  searchable?: boolean;
  featured?: boolean;
  memberCount?: number;
  postCount?: number;
  conversationCount?: number;
  activityScore?: number;
  trendingScore?: number;
  recommendationScore?: number;
  collegeId?: string | null;
  departmentId?: string | null;
  companyId?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  tags?: string[];
  searchKeywords?: string[];
  autoJoinEligible?: boolean;
  joinApprovalRequired?: boolean;
  college?: College | null;
  department?: Department | null;
  company?: Company | null;
  members?: CommunityMember[];
  conversations?: CommunityConversation[];
  posts?: FeedPost[];
  createdById?: string;
  createdBy?: User;
  _count?: {
    members?: number;
    posts?: number;
    conversations?: number;
  };
  createdAt?: string;
  updatedAt?: string;
};

export type CommunityMutationPayload = {
  name: string;
  description?: string;
  type: CommunityType;
  category: CommunityCategory;
  tags?: string[];
  searchKeywords?: string[];
  companyId?: string;
  collegeId?: string;
  departmentId?: string;
  city?: string;
  autoJoinEligible?: boolean;
};

export type ConversationType =
  | "DIRECT"
  | "GROUP"
  | "TEAM"
  | "COLLEGE"
  | "DEPARTMENT"
  | "PROJECT"
  | "HACKATHON"
  | "COMMUNITY";

export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "FILE" | "SYSTEM";

export type ChatAttachmentType = "IMAGE" | "VIDEO" | "FILE";

export type ChatAttachment = {
  id?: string;
  name: string;
  url?: string;
  dataUrl?: string;
  mimeType: string;
  size: number;
  type?: ChatAttachmentType;
  width?: number;
  height?: number;
  duration?: number;
};

export type MessageReaction = {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt?: string;
  user?: User;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content?: string | null;
  type?: MessageType;
  attachments?: ChatAttachment[] | null;
  replyToMessageId?: string | null;
  forwardedFromMessageId?: string | null;
  readByUsers?: string[];
  editedAt?: string | null;
  deletedAt?: string | null;
  reactionCount?: number;
  sender?: User;
  replyToMessage?: ChatMessage | null;
  reactions?: MessageReaction[];
  createdAt?: string;
};

export type ConversationParticipant = {
  id: string;
  conversationId: string;
  userId: string;
  pinned?: boolean;
  muted?: boolean;
  archived?: boolean;
  deletedAt?: string | null;
  unreadCount?: number;
  lastDeliveredAt?: string | null;
  lastReadAt?: string | null;
  joinedAt?: string;
  user?: User;
};

export type Conversation = {
  id: string;
  type: ConversationType;
  category?: CommunityCategory | null;
  title?: string | null;
  description?: string | null;
  avatarUrl?: string | null;
  public?: boolean;
  archived?: boolean;
  createdById?: string | null;
  teamId?: string | null;
  collegeId?: string | null;
  departmentId?: string | null;
  projectId?: string | null;
  hackathonId?: string | null;
  communityId?: string | null;
  participants?: ConversationParticipant[];
  messages?: ChatMessage[];
  unreadCount?: number;
  lastMessageAt?: string | null;
  messageCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ChatMessagesPage = {
  messages: ChatMessage[];
  nextCursor?: string | null;
};

export type SendMessagePayload = {
  content?: string;
  type?: MessageType;
  attachments?: ChatAttachment[];
  replyToMessageId?: string;
};

export type CreateGroupConversationPayload = {
  title: string;
  description?: string;
  avatarUrl?: string;
  participantIds: string[];
};

export type Hackathon = {
  id: string;
  title: string;
  slug?: string | null;
  description?: string;
  shortDescription?: string | null;
  bannerUrl?: string | null;
  logoUrl?: string | null;
  startDate?: string;
  endDate?: string;
  registrationDeadline?: string;
  maxTeamSize?: number;
  tracks?: unknown;
  rules?: unknown;
  prizes?: unknown;
  judgingCriteria?: unknown;
  organizerName?: string | null;
  organizerWebsite?: string | null;
  organizerType?: string | null;
  sponsorName?: string | null;
  sponsorWebsite?: string | null;
  mode?: string | null;
  location?: string | null;
  verified?: boolean;
  featured?: boolean;
  isExternal?: boolean;
  sourcePlatform?: string | null;
  externalUrl?: string | null;
  registrationCount?: number;
  submissionCount?: number;
  judgeCount?: number;
  winnerCount?: number;
  viewCount?: number;
  status?: string;
  createdById?: string;
  createdBy?: User;
  searchScore?: number;
  trendingScore?: number;
  rankingScore?: number;
  tags?: string[];
  difficultyLevel?: string | null;
  registrations?: HackathonRegistration[];
  submissions?: HackathonSubmission[];
  judges?: HackathonJudge[];
  winners?: HackathonWinner[];
  analytics?: {
    averageEngineeringScore?: number;
    verifiedSubmissionCount?: number;
    totalProjects?: number;
    totalTeams?: number;
    totalJudges?: number;
    totalWinners?: number;
  };
  _count?: {
    registrations?: number;
    submissions?: number;
    judges?: number;
    winners?: number;
  };
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
  archivedAt?: string | null;
  deletedAt?: string | null;
};

export type HackathonRegistration = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt?: string;
  reviewedAt?: string | null;
  team?: Team;
};

export type HackathonSubmission = {
  id: string;
  hackathonId?: string;
  teamId?: string;
  projectId?: string;
  githubUrl?: string | null;
  demoUrl?: string | null;
  videoUrl?: string | null;
  presentationUrl?: string | null;
  description?: string | null;
  techStack?: unknown;
  status?: string;
  score?: number | null;
  finalScore?: number | null;
  rankingPosition?: number | null;
  engineeringScore?: number | null;
  verifiedProject?: boolean;
  submittedAt?: string;
  reviewedAt?: string | null;
  project?: Project;
  team?: Team;
  evaluations?: Array<{
    id: string;
    judge?: HackathonJudge;
  }>;
  winners?: Array<{
    id: string;
    position: number;
    score: number;
  }>;
  rank?: number;
  rankingScore?: number;
};

export type HackathonJudge = {
  id: string;
  hackathonId?: string;
  userId?: string;
  expertise?: unknown;
  bio?: string | null;
  canEvaluateOwnTeam?: boolean;
  active?: boolean;
  user?: User;
  createdAt?: string;
};

export type HackathonWinner = {
  id: string;
  position: number;
  score: number;
  prize?: string | null;
  submission?: HackathonSubmission;
  team?: Team;
};

export type HackathonLeaderboard = {
  hackathon?: Pick<Hackathon, "id">;
  totalSubmissions?: number;
  leaderboard: HackathonSubmission[];
};

export type HackathonMutationPayload = {
  title: string;
  description: string;
  bannerUrl?: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  maxTeamSize: number;
};

export type HackathonSubmissionPayload = {
  teamId: string;
  projectId: string;
  githubUrl?: string;
  demoUrl?: string;
  presentationUrl?: string;
  description?: string;
};

export type HackathonEvaluationPayload = {
  innovationScore: number;
  technicalScore: number;
  scalabilityScore: number;
  designScore: number;
  businessScore: number;
  presentationScore: number;
  feedback?: string;
};

export type SearchResults = {
  users?: User[];
  projects?: Project[];
  hackathons?: Hackathon[];
  jobs?: Job[];
  companies?: Company[];
  communities?: Community[];
  colleges?: College[];
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

export type JobApplicationStatus =
  | "APPLIED"
  | "VIEWED"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "REJECTED"
  | "HIRED";

export type JobApplication = {
  id: string;
  jobId: string;
  applicantId?: string;
  status?: JobApplicationStatus;
  resumeUrl?: string | null;
  coverLetter?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  linkedinUrl?: string | null;
  recruiterNotes?: string | null;
  viewedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  job?: Job;
  applicant?: User;
};

export type JobApplicationPayload = {
  resumeUrl?: string;
  coverLetter?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
};

export type JobApplicationStatusPayload = {
  status: Exclude<JobApplicationStatus, "APPLIED" | "VIEWED">;
  recruiterNotes?: string;
};

export type ReferralRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "REFERRED";

export type ReferralRequest = {
  id: string;
  requesterId?: string;
  referrerId?: string;
  companyId?: string | null;
  companySlug?: string | null;
  companyName?: string | null;
  jobRole?: string;
  jobId?: string | null;
  jobUrl?: string | null;
  message?: string | null;
  status?: ReferralRequestStatus;
  githubUrl?: string | null;
  codingProfileUrl?: string | null;
  resumeUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  requester?: User;
  referrer?: User;
  company?: Company;
  job?: Job;
};

export type ReferralRequestPayload = {
  companyId?: string;
  companySlug?: string;
  companyName?: string;
  jobRole: string;
  jobId?: string;
  jobUrl?: string;
  message?: string;
  githubUrl?: string;
  codingProfileUrl?: string;
  resumeUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
};

export type Badge = {
  id: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  category?: string | null;
  rarity?: string | null;
  points?: number;
};

export type ReputationSummary = {
  userId?: string;
  username?: string;
  reputationScore?: number;
  engineeringScore?: number;
  trustLevel?: string;
  badges?: Badge[];
  history?: ReputationHistoryItem[];
  user?: User;
  [key: string]: unknown;
};

export type ReputationHistoryItem = {
  id: string;
  type?: string;
  points?: number;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
};

export type ActivityItem = {
  id: string;
  userId?: string;
  type?: string;
  title?: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  user?: User;
};

export type ActivityPage = {
  activities: ActivityItem[];
  nextCursor?: string | null;
  hasNextPage?: boolean;
  limit?: number;
};

export type InteractionPayload = {
  entityId: string;
  entityType: string;
  interactionType?: string;
  action?: string;
  position?: number;
  clicked?: boolean;
  hidden?: boolean;
  metadata?: Record<string, unknown>;
};

export type LeaderboardResult<T> = T[] | { items?: T[]; leaderboard?: T[] };

export type CandidateRanking = {
  user?: User;
  userId?: string;
  fitScore?: number;
  score?: number;
  reasons?: string[];
  application?: JobApplication;
  [key: string]: unknown;
};

export type RecruiterInsights = {
  jobs?: Job[];
  applications?: JobApplication[];
  candidates?: CandidateRanking[];
  [key: string]: unknown;
};

export type RecruiterDashboard = {
  jobs?: Job[];
  applications?: JobApplication[];
  insights?: RecruiterInsights;
  [key: string]: unknown;
};

export type RecruiterJobPipelineCard = {
  id: string;
  status: string;
  appliedAt: string;
  resumeUrl?: string | null;
  coverLetter?: string | null;
  recruiterNotes?: string | null;
  candidate: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl?: string | null;
    headline?: string | null;
    engineeringScore?: number | null;
    trustLevel?: string | null;
    reputationScore?: number | null;
  };
  skillsMatch: {
    matched: string[];
    totalRequired: number;
    matchPercentage: number;
  };
  verificationMetrics: {
    totalExperiences: number;
    verifiedExperiences: number;
    suspiciousExperiences: number;
    averageVerificationScore: number;
    isVerifiedEngineer?: boolean | null;
  };
  badges: Array<{
    name: string;
    rarity?: string | null;
    category?: string | null;
  }>;
};

export type RecruiterJobPipeline = {
  job: {
    id: string;
    title?: string | null;
  };
  pipeline: Record<string, RecruiterJobPipelineCard[]>;
};

export type EngineeringPortfolio = {
  user?: User;
  projects?: Project[];
  experiences?: Experience[];
  skills?: UserSkill[];
  reputation?: ReputationSummary;
  [key: string]: unknown;
};

export type TrendingFeedItem = FeedItem & {
  entityId?: string;
  entityType?: FeedItemType;
};

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5000/api/v1";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  timeoutMs?: number;
};

type EndpointOptions = Pick<RequestOptions, "signal" | "timeoutMs">;

const toQuery = (
  params: Record<string, string | number | boolean | undefined>,
) => {
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

const createRequestSignal = (
  signal?: AbortSignal | null,
  timeoutMs = 15000,
) => {
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
  health: (options?: EndpointOptions) =>
    request<{ routes?: Record<string, string> }>("", options),
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
  logout: () =>
    request<{ loggedOut: boolean }>("/auth/logout", { method: "POST" }),
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
  addSkill: (body: {
    skillId: string;
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  }) => request<UserSkill>("/users/me/skills", { method: "POST", body }),
  deleteSkill: (skillId: string) =>
    request<{ id: string }>(`/users/me/skills/${skillId}`, { method: "DELETE" }),
  deleteExperience: (experienceId: string) =>
    request<{ id: string }>(`/users/me/experiences/${experienceId}`, { method: "DELETE" }),
  deleteEducation: (educationId: string) =>
    request<{ id: string }>(`/users/me/educations/${educationId}`, { method: "DELETE" }),
  updateExperience: (experienceId: string, body: {
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
      statusDistribution: Array<{ status: string; count: number }>;
      trustLevelDistribution: Array<{ trustLevel: string; count: number }>;
    }>("/admin/stats", options),
  listAdminUsers: (params: { search?: string; limit?: number; cursor?: string }, options?: EndpointOptions) =>
    request<{
      users: User[];
      nextCursor: string | null;
      hasNextPage: boolean;
    }>(`/admin/users${toQuery(params)}`, options),
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
  myProjects: (options?: EndpointOptions) =>
    request<Project[]>("/users/me/projects", options),
  searchSkills: (q: string, options?: EndpointOptions) =>
    request<Skill[]>(
      `/users/skills/search${toQuery({ q, limit: 12 })}`,
      options,
    ),
  searchColleges: (q: string) =>
    request<College[]>(`/colleges/search${toQuery({ q })}`),
  colleges: (limit = 50, options?: CursorOptions) => {
    const { cursor, ...requestOptions } = options || {};
    return request<CollegePage>(
      `/colleges${toQuery({ limit, cursor })}`,
      requestOptions,
    );
  },
  createCollege: (body: CollegeMutationPayload) =>
    request<College>("/colleges", { method: "POST", body }),
  createDepartment: (body: DepartmentMutationPayload) =>
    request<Department>("/colleges/departments", { method: "POST", body }),
  departments: (collegeId: string, options?: EndpointOptions) =>
    request<Department[]>(`/colleges/${collegeId}/departments`, options),
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
    } = {},
    options?: EndpointOptions,
  ) => request<CompanyPage>(`/companies${toQuery(params)}`, options),
  company: (slug: string, options?: EndpointOptions) =>
    request<Company>(`/companies/${slug}`, options),
  createCompany: (body: CompanyMutationPayload) =>
    request<Company>("/companies", { method: "POST", body }),
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
    request<FeedItem[]>(`/feed${toQuery({ limit })}`, options),
  createPost: (body: {
    content: string;
    type: string;
    tags?: string[];
    visibility?: string;
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
  hackathons: (options?: EndpointOptions) =>
    request<Hackathon[]>("/hackathons", options),
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
  jobs: (options?: EndpointOptions) => request<Job[]>("/jobs", options),
  createJob: (body: Partial<Job>) =>
    request<Job>("/jobs", { method: "POST", body }),
  job: (slug: string, options?: EndpointOptions) =>
    request<Job>(`/jobs/${slug}`, options),
  companyJobs: (companyId: string, options?: EndpointOptions) =>
    request<Job[]>(`/jobs/company/${companyId}`, options),
  recruiterJobs: (options?: EndpointOptions) =>
    request<Job[]>("/jobs/my/jobs", options),
  applyToJob: (jobId: string, body: JobApplicationPayload) =>
    request<JobApplication>(`/job-applications/jobs/${jobId}/apply`, {
      method: "POST",
      body,
    }),
  myJobApplications: (options?: EndpointOptions) =>
    request<JobApplication[]>("/job-applications/my", options),
  jobApplications: (jobId: string, options?: EndpointOptions) =>
    request<JobApplication[]>(`/job-applications/jobs/${jobId}`, options),
  updateJobApplicationStatus: (
    applicationId: string,
    body: JobApplicationStatusPayload,
  ) =>
    request<JobApplication>(`/job-applications/${applicationId}/status`, {
      method: "PATCH",
      body,
    }),
  markJobApplicationViewed: (applicationId: string) =>
    request<JobApplication>(`/job-applications/${applicationId}/view`, {
      method: "PATCH",
    }),
  saveJob: (jobId: string) =>
    request<{ saved?: boolean }>(`/recommendations/jobs/${jobId}/save`, {
      method: "POST",
    }),
  savedJobs: (options?: EndpointOptions) =>
    request<Job[]>("/recommendations/saved-jobs", options),
  recommendedJobs: (options?: EndpointOptions) =>
    request<Job[]>("/recommendations/recommended-jobs", options),
  internshipRecommendations: (options?: EndpointOptions) =>
    request<Job[]>("/recommendations/internships", options),
  trendingJobs: (options?: EndpointOptions) =>
    request<Job[]>("/recommendations/trending-jobs", options),
  advancedRecommendedJobs: (options?: EndpointOptions) =>
    request<Job[]>("/recommendations/advanced-jobs", options),
  recommendedCollaborators: (options?: EndpointOptions) =>
    request<User[]>("/recommendations/collaborators", options),
  recommendedProjects: (options?: EndpointOptions) =>
    request<Project[]>("/recommendations/projects", options),
  createReferralRequest: (userId: string, body: ReferralRequestPayload) =>
    request<ReferralRequest>(`/referrals/request/${userId}`, {
      method: "POST",
      body,
    }),
  reviewReferralRequest: (
    requestId: string,
    status: Exclude<ReferralRequestStatus, "PENDING">,
  ) =>
    request<ReferralRequest>(`/referrals/${requestId}/review`, {
      method: "PATCH",
      body: { status },
    }),
  receivedReferralRequests: (options?: EndpointOptions) =>
    request<ReferralRequest[]>("/referrals/received", options),
  sentReferralRequests: (options?: EndpointOptions) =>
    request<ReferralRequest[]>("/referrals/sent", options),
  searchGlobal: (q: string, options?: EndpointOptions) =>
    request<SearchResults>(`/search/global${toQuery({ q })}`, options),
  searchUsers: (q: string, options?: EndpointOptions) =>
    request<User[]>(`/search/users${toQuery({ q, limit: 12 })}`, options),
  searchProjects: (q: string, options?: EndpointOptions) =>
    request<Project[]>(`/search/projects${toQuery({ q, limit: 12 })}`, options),
  searchHackathons: (q: string, options?: EndpointOptions) =>
    request<Hackathon[]>(
      `/search/hackathons${toQuery({ q, limit: 12 })}`,
      options,
    ),
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
};
