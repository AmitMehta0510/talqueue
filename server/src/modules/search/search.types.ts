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

  sortBy?:
    | "RELEVANCE"
    | "ENGINEERING_SCORE"
    | "REPUTATION"
    | "RECENT";

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

  sortBy?:
    | "RELEVANCE"
    | "TRENDING"
    | "ENGINEERING_SCORE"
    | "RECENT";

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

  sortBy?:
    | "RELEVANCE"
    | "TRENDING"
    | "POPULAR"
    | "RECENT";

  page?: number;

  limit?: number;
}