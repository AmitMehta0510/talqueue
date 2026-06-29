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
  companyAdminships?: Array<{
    id: string;
    companyId: string;
    officeCity?: string | null;
    company?: {
      id: string;
      name: string;
      slug: string;
      logoUrl?: string | null;
    } | null;
  }>;
  collegeAdminships?: Array<{
    id: string;
    collegeId: string;
    college?: {
      id: string;
      name: string;
    } | null;
  }>;
  cdcrMemberships?: Array<{
    id: string;
    collegeId: string;
    college?: {
      id: string;
      name: string;
    } | null;
  }>;
  tpoMemberships?: Array<{
    id: string;
    collegeId: string;
    college?: {
      id: string;
      name: string;
      normalizedKey?: string;
    } | null;
  }>;
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
  mutualConnectionCount?: number;
  _count?: {
    skills?: number;
    experiences?: number;
    educations?: number;
    roles?: number;
    posts?: number;
    projectMemberships?: number;
    followers?: number;
  };
  skills?: UserSkill[];
  experiences?: Experience[];
  educations?: Education[];
  codingProfiles?: CodingProfile[];
  ownedProjects?: Project[];
  createdAt?: string;
  updatedAt?: string;
  lastActiveAt?: string | null;
};

export type CodingProfile = {
  id: string;
  platform: string;
  username: string;
  url?: string | null;
};

export type College = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  normalizedKey?: string;
  createdAt?: string;
  // Public profile fields
  description?: string | null;
  establishedYear?: number | null;
  institutionType?: string | null;
  collegeType?: string | null;
  affiliation?: string | null;
  naacGrade?: string | null;
  galleryImages?: string[];
  glanceStats?: {
    smartClassrooms?: number;
    labs?: number;
    researchPapers?: string | number;
    mous?: number;
    annualEvents?: string | number;
    startupsIncubated?: number;
  } | null;
  // Enriched counts
  _count?: {
    departments?: number;
    profiles?: number;
    educations?: number;
  };
  // Enriched relations
  departments?: Array<{
    id: string;
    name: string;
    hod?: string | null;
    createdAt?: string;
    _count?: { profiles: number };
  }>;
  profiles?: Array<{ avatarUrl?: string | null; fullName?: string | null }>;
  // Alumni (computed by service)
  alumniAvatars?: Array<{ avatarUrl?: string | null; fullName?: string | null }>;
  alumniCount?: number;
};

export type CollegePlacementSummary = {
  placementPercent: number;
  avgPackageLPA: number | null;
  maxPackageLPA: number | null;
  totalDrives: number;
  topRecruiters: Array<{
    companyId: string;
    companyName: string;
    companyLogo?: string | null;
  }>;
};

export type Department = {
  id: string;
  name: string;
  collegeId: string;
  createdAt?: string;
};

export type StandardDepartment = {
  id: string;
  name: string;
  aliases: string[];
};

export type UserSkill = {
  id: string;
  level?: string;
  verified?: boolean;
  verificationSource?: string | null;
  verificationProof?: any | null;
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
  workEmail?: string | null;
  techStack?: string[];
  skillsUsed?: string[];
  teamSize?: number | null;
  user?: User;
  company?: {
    name?: string;
    logoUrl?: string | null;
    verified?: boolean;
    websiteUrl?: string | null;
  } | null;
};

export type Education = {
  id: string;
  collegeId?: string | null;
  customCollegeName?: string | null;
  departmentId?: string | null;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  current?: boolean;
  college?: College | null;
  department?: Department | null;
  collegeEmail?: string | null;
  collegeEmailVerified?: boolean;
  cgpa?: number | null;
  backlogs?: number | null;
  currentYear?: number | null;
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

export type EventType = "COLLEGE" | "COMPANY" | "GENERAL";
export type RSVPStatus = "GOING" | "MAYBE" | "DECLINED";

export type Event = {
  id: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  location?: string | null;
  meetingUrl?: string | null;
  capacity?: number | null;
  type: EventType;
  collegeId?: string | null;
  companyId?: string | null;
  communityId?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    username: string;
    profile?: {
      fullName?: string | null;
      avatarUrl?: string | null;
    } | null;
  };
  college?: College | null;
  company?: Company | null;
  community?: Community | null;
  rsvps?: EventRSVP[];
  userRSVPStatus?: RSVPStatus | null;
  _count?: {
    rsvps?: number;
  };
};

export type EventRSVP = {
  id: string;
  eventId: string;
  userId: string;
  status: RSVPStatus;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    profile?: {
      fullName?: string | null;
      avatarUrl?: string | null;
    } | null;
  };
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
  mediaUrl?: string;
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
  requirements?: string | null;
  responsibilities?: string | null;
  perks?: string | null;
  location?: string | null;
  workMode?: string | null;
  type?: string;
  experienceLevel?: string | null;
  skillsRequired?: string[];
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  openings?: number | null;
  applyUrl?: string | null;
  applicationDeadline?: string | null;
  featured?: boolean;
  ppoOffered?: boolean;
  applicationsCount?: number;
  companyId?: string;
  company?: {
    id?: string;
    name?: string;
    logoUrl?: string | null;
    verified?: boolean;
    tagline?: string | null;
    slug?: string;
  };
  createdAt?: string;
  /** Source posting date from ATS (Greenhouse/Lever/Ashby). Null for manually posted jobs. */
  postedAt?: string | null;
};

export type ExternalAppStatus =
  | "APPLIED"
  | "PHONE_SCREEN"
  | "TECHNICAL_ROUND"
  | "HR_ROUND"
  | "OFFER_RECEIVED"
  | "REJECTED"
  | "WITHDRAWN";

export type ExternalJobApplication = {
  id: string;
  userId: string;
  jobId?: string | null;
  jobTitle: string;
  companyName: string;
  companyLogoUrl?: string | null;
  applyUrl?: string | null;
  location?: string | null;
  jobType?: string | null;
  status: ExternalAppStatus;
  notes?: string | null;
  appliedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PlacementDriveStatus = "UPCOMING" | "ONGOING" | "CLOSED";
export type PlacementDriveType = "PLACEMENT" | "INTERNSHIP";
export type PlacementDriveApplicationStatus =
  | "APPLIED"
  | "SHORTLISTED"
  | "INTERVIEW_R1"
  | "INTERVIEW_R2"
  | "INTERVIEW_R3"
  | "PPO_OFFERED"
  | "SELECTED"
  | "REJECTED"
  | "WITHDRAWN";

export type CollegeOfferPolicy = "OPEN" | "ONE_OFFER_LOCK" | "DREAM_EXCEPTION";

export type EligibilityResult = {
  eligible: boolean;
  reasons: string[];
  missingFields: string[];
};

export type PlacementDrive = {
  id: string;
  driveTitle: string;
  companyId: string;
  targetCollegeId: string;
  postedById: string;
  driveDate?: string | null;
  applyDeadline?: string | null;
  status: PlacementDriveStatus;
  driveType: PlacementDriveType;
  roles: string[];
  stipendMin?: number | null;
  stipendMax?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  internshipDurationMonths?: number | null;
  minCgpa?: number | null;
  maxBacklogs?: number | null;
  eligibleBranches: string[];
  eligibleYears: number[];
  isDreamCompany: boolean;
  ppoOffered: boolean;   // Internship drive that may convert to PPO
  description?: string | null;
  company?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    slug?: string;
    verified?: boolean;
  };
  college?: {
    id: string;
    name: string;
    offerPolicy?: CollegeOfferPolicy;
  };
  _count?: {
    applications?: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type PlacementDriveApplication = {
  id: string;
  driveId: string;
  userId: string;
  note?: string | null;
  status: PlacementDriveApplicationStatus;
  appliedAt: string;
  drive?: PlacementDrive & {
    company?: { id: string; name: string; logoUrl?: string | null; slug?: string };
    college?: { id: string; name: string };
  };
  user?: {
    id: string;
    username: string;
    email: string;
    profile?: { fullName: string; avatarUrl?: string | null; headline?: string | null } | null;
    educations?: Array<{
      cgpa?: number | null;
      backlogs?: number | null;
      currentYear?: number | null;
      department?: { name: string } | null;
    }>;
  };
  createdAt: string;
  updatedAt: string;
};

export type PlacementDriveRound = {
  id: string;
  driveId: string;
  roundNumber: number;
  roundType: string;
  scheduledAt?: string | null;
  venue?: string | null;
  meetLink?: string | null;
  durationMin?: number | null;
  maxSlots?: number | null;
  notes?: string | null;
  shortlistedApplications?: PlacementDriveRoundShortlist[];
  createdAt: string;
};

export type PlacementDriveRoundShortlist = {
  id: string;
  roundId: string;
  applicationId: string;
  advancedAt: string;
  round?: PlacementDriveRound;
  application?: PlacementDriveApplication;
};

export type AlumniClaim = {
  id: string;
  userId: string;
  collegeId: string;
  isAlumni: boolean;
  alumniVerified: boolean;
  alumniVerifiedAt?: string | null;
  user?: {
    id: string;
    username: string;
    email: string;
    profile?: {
      fullName?: string | null;
      avatarUrl?: string | null;
    } | null;
  };
};

export type PlacementStats = {
  summary: {
    totalDrives: number;
    totalApplicants: number;
    totalSelected: number;
    placementPercent: number;
    avgPackageLPA: number | null;
    maxPackageLPA: number | null;
    totalInternshipDrives: number;
  };
  byBranch: Array<{
    branch: string;
    total: number;
    selected: number;
    placementPercent: number;
  }>;
  byCompany: Array<{
    companyId: string;
    companyName: string;
    companyLogo?: string | null;
    offers: number;
    avgPackageLPA: number | null;
  }>;
  recentDrives: Array<{
    id: string;
    title: string;
    driveType: string;
    status: string;
    companyName?: string | null;
    applicants: number;
    selected: number;
    driveDate?: string | null;
  }>;
};

export type PlacementDriveInviteStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
export type PlacementDriveInviteDirection = "COMPANY_TO_COLLEGE" | "COLLEGE_TO_COMPANY";

export type PlacementDriveInvite = {
  id: string;
  companyId: string;
  collegeId: string;
  initiatedBy: PlacementDriveInviteDirection;
  driveTitle: string;
  driveDate?: string | null;
  applyDeadline?: string | null;
  roles: string[];
  stipendMin?: number | null;
  stipendMax?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  minCgpa?: number | null;
  eligibleBranches: string[];
  eligibleYears: number[];
  description?: string | null;
  message?: string | null;
  status: PlacementDriveInviteStatus;
  reviewedAt?: string | null;
  createdById: string;
  placementDriveId?: string | null;
  company?: { id: string; name: string; logoUrl?: string | null; slug?: string; type?: string };
  college?: { id: string; name: string };
  createdBy?: { id: string; username: string; profile?: { fullName: string; avatarUrl?: string | null } | null };
  placementDrive?: { id: string; status: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type CdcrMember = {
  id: string;
  userId: string;
  collegeId: string;
  assignedById: string;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    email: string;
    status: string;
    profile?: {
      fullName: string;
      avatarUrl?: string | null;
    } | null;
  };
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
      | "applyUrl"
    >
  >;
  experiences?: Experience[];
  _count?: {
    jobs?: number;
    experiences?: number;
    referralRequests?: number;
    followers?: number;
  };
  isFollowing?: boolean;
  createdAt?: string;
  offices?: CompanyOffice[];
  departments?: CompanyDepartment[];
};

export type CompanyOffice = {
  id: string;
  companyId: string;
  name: string;
  address?: string | null;
  city: string;
  managerId?: string | null;
};

export type CompanyDepartment = {
  id: string;
  companyId: string;
  name: string;
  code?: string | null;
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
  isPendingApproval?: boolean;
  isMember?: boolean;
  currentUserRole?: string | null;
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
  minTeamSize?: number;
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
  minTeamSize?: number;
  isExternal?: boolean;
  externalUrl?: string;
  sourcePlatform?: string;
  organizerName?: string;
  organizerWebsite?: string;
  mode?: "ONLINE" | "OFFLINE" | "HYBRID";
  location?: string;
  tags?: string[];
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

export type RankedUser      = { user: User;       relevanceScore: number; matchReasons: string[] };
export type RankedProject   = { project: Project;   relevanceScore: number; matchReasons: string[] };
export type RankedHackathon = { hackathon: Hackathon; relevanceScore: number; matchReasons: string[] };

export type SearchResults = {
  users?:       any[];
  projects?:    any[];
  hackathons?:  any[];
  jobs?:        Job[];
  companies?:   Company[];
  communities?: Community[];
  topResults?:  { type: string; score: number; data: unknown }[];
  jobsTotal?:   number;
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
