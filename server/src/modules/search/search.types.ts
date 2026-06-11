export interface SearchUsersFilters {
  query?: string;
  collegeIds?: string[];
  departmentIds?: string[];
  graduationYears?: number[];
  skills?: string[];
  trustLevels?: string[];
  companyNames?: string[];
  minEngineeringScore?: number;
  maxEngineeringScore?: number;
  openToWork?: boolean;
  openToInternship?: boolean;
  acceptingCollaborators?: boolean;
  acceptingReferrals?: boolean;
  verifiedOnly?: boolean;
  sortBy?: "RELEVANCE" | "ENGINEERING_SCORE" | "REPUTATION" | "RECENT";
  page?: number;
  limit?: number;
}

export interface SearchProjectsFilters {
  query?: string;
  techStack?: string[];
  domains?: string[];
  difficultyLevels?: string[];
  verifiedOnly?: boolean;
  featuredOnly?: boolean;
  lookingForCollaborators?: boolean;
  minEngineeringScore?: number;
  sortBy?: "RELEVANCE" | "TRENDING" | "ENGINEERING_SCORE" | "RECENT";
  page?: number;
  limit?: number;
}

export interface SearchHackathonsFilters {
  query?: string;
  tags?: string[];
  verifiedOnly?: boolean;
  featuredOnly?: boolean;
  difficultyLevels?: string[];
  upcomingOnly?: boolean;
  sortBy?: "RELEVANCE" | "TRENDING" | "POPULAR" | "RECENT";
  page?: number;
  limit?: number;
}

export interface SearchJobsFilters {
  query?: string;
  companyName?: string;
  skills?: string[];
  workMode?: string;
  experienceLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  location?: string;
  type?: string;
  /** Number of days since posting; e.g. 1=today, 7=this week */
  postedWithinDays?: number;
  limit?: number;
}

export interface SearchCompaniesFilters {
  query?: string;
  industry?: string;
  size?: string;
  location?: string;
  hiringEnabled?: boolean;
  referralEnabled?: boolean;
  verified?: boolean;
  limit?: number;
}

export interface SearchCommunitiesFilters {
  query?: string;
  type?: string;
  category?: string;
  limit?: number;
}