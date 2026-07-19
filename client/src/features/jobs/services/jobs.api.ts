import { request, toQuery } from "../../../core/api/client";
import type { EndpointOptions } from "../../../core/api/client";
import type {
  Job,
  JobApplication,
  JobApplicationPayload,
  JobApplicationStatusPayload,
  ReferralRequest,
  ReferralRequestPayload,
  ReferralRequestStatus,
  PlacementDrive,
  PlacementDriveApplication,
  PlacementDriveApplicationStatus,
  PlacementDriveInvite,
  PlacementDriveRound,
  EligibilityResult,
  PlacementStats,
  User,
} from "../../../core/types/models";

export const PLACEMENT_DRIVE_STATUS_LABELS: Record<PlacementDriveApplicationStatus, string> = {
  APPLIED: "Applied",
  SHORTLISTED: "Shortlisted",
  INTERVIEW_R1: "Round 1 Interview",
  INTERVIEW_R2: "Round 2 Interview",
  INTERVIEW_R3: "Round 3 Interview",
  PPO_OFFERED: "PPO Offered",
  SELECTED: "Selected",
  REJECTED: "Not Selected",
  WITHDRAWN: "Withdrawn",
};

export const jobsApi = {
  jobs: (
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      workMode?: string[];
      jobType?: string[];
      skills?: string[];
      location?: string[];
      roles?: string[];
      freshness?: string | null;
    },
    options?: EndpointOptions,
  ) => {
    const flatParams = params
      ? {
          page: params.page,
          limit: params.limit,
          search: params.search,
          workMode: params.workMode?.join(","),
          jobType: params.jobType?.join(","),
          skills: params.skills?.join(","),
          location: params.location?.join(","),
          roles: params.roles?.join(","),
          freshness: params.freshness || undefined,
        }
      : {};
    return request<{
      jobs: Job[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/jobs${toQuery(flatParams)}`, options);
  },

  job: (slug: string, options?: EndpointOptions) =>
    request<Job>(`/jobs/${slug}`, options),

  createJob: (body: {
    companyId?: string;
    companyName?: string;
    title: string;
    description: string;
    requirements?: string;
    responsibilities?: string;
    location?: string;
    workMode?: string;
    type: string;
    experienceLevel?: string;
    salaryMin?: number;
    salaryMax?: number;
    currency?: string;
    openings?: number;
    skillsRequired?: string[];
    applicationDeadline?: string;
    applyUrl?: string;
  }) =>
    request<any>("/jobs", { method: "POST", body }),

  companyJobs: (
    companyId: string,
    page?: number,
    limit?: number,
    options?: EndpointOptions,
  ) =>
    request<{
      jobs: Job[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/jobs/company/${companyId}${toQuery({ page, limit })}`, options),

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

  jobSkillsAutocomplete: (q: string, limit = 15, options?: EndpointOptions) =>
    request<string[]>(`/jobs/skills/autocomplete${toQuery({ q, limit })}`, options),

  jobLocationsAutocomplete: (q: string, limit = 15, options?: EndpointOptions) =>
    request<string[]>(`/jobs/locations/autocomplete${toQuery({ q, limit })}`, options),

  searchJobs: (params: { q?: string; companyName?: string; skills?: string; workMode?: string; experienceLevel?: string; location?: string; type?: string; salaryMin?: number; salaryMax?: number; postedWithinDays?: number; limit?: number }, options?: EndpointOptions) =>
    request<{ jobs: Job[]; total: number }>(`/search/jobs${toQuery({ ...params, limit: params.limit || 20 })}`, options),

  // Placement Drives
  placementDrivesForCollege: (collegeId: string, options?: EndpointOptions) =>
    request<PlacementDrive[]>(`/placement-drives/college/${collegeId}`, options),

  myPostedDrives: (options?: EndpointOptions) =>
    request<PlacementDrive[]>("/placement-drives/mine", options),

  createPlacementDrive: (body: Partial<PlacementDrive> & { driveTitle: string; companyId: string; targetCollegeId: string }) =>
    request<PlacementDrive>("/placement-drives", { method: "POST", body }),

  updatePlacementDrive: (id: string, body: Partial<PlacementDrive>) =>
    request<PlacementDrive>(`/placement-drives/${id}`, { method: "PATCH", body }),

  closePlacementDrive: (id: string) =>
    request<{ success: boolean }>(`/placement-drives/${id}/close`, { method: "PATCH", body: {} }),

  allDrivesForCollege: (collegeId: string, options?: EndpointOptions) =>
    request<PlacementDrive[]>(`/placement-drives/college/${collegeId}/admin`, options),

  checkDriveEligibility: (driveId: string, options?: EndpointOptions) =>
    request<EligibilityResult>(`/placement-drives/${driveId}/eligibility`, options),

  applyToDrive: (driveId: string, note?: string) =>
    request<PlacementDriveApplication>(`/placement-drives/${driveId}/apply`, { method: "POST", body: { note } }),

  myDriveApplications: (options?: EndpointOptions) =>
    request<PlacementDriveApplication[]>("/placement-drives/applications/mine", options),

  getDriveApplicants: (driveId: string, options?: EndpointOptions) =>
    request<PlacementDriveApplication[]>(`/placement-drives/${driveId}/applicants`, options),

  updateDriveApplicationStatus: (applicationId: string, status: PlacementDriveApplicationStatus) =>
    request<PlacementDriveApplication>(`/placement-drives/applications/${applicationId}`, { method: "PATCH", body: { status } }),

  sendDriveInvite: (body: Partial<PlacementDriveInvite> & { companyId: string; collegeId: string; driveTitle: string }) =>
    request<PlacementDriveInvite>("/drive-invites", { method: "POST", body }),

  driveInvitesForCollege: (collegeId: string, options?: EndpointOptions) =>
    request<PlacementDriveInvite[]>(`/drive-invites/college/${collegeId}`, options),

  sentInvitesByCollege: (collegeId: string, options?: EndpointOptions) =>
    request<PlacementDriveInvite[]>(`/drive-invites/college/${collegeId}/sent`, options),

  driveInvitesForCompany: (companyId: string, options?: EndpointOptions) =>
    request<PlacementDriveInvite[]>(`/drive-invites/company/${companyId}`, options),

  inboundDriveInvitesForCompany: (companyId: string, options?: EndpointOptions) =>
    request<PlacementDriveInvite[]>(`/drive-invites/company/${companyId}/received`, options),

  respondToDriveInvite: (inviteId: string, action: "ACCEPT" | "REJECT") =>
    request<PlacementDriveInvite>(`/drive-invites/${inviteId}/respond`, { method: "PATCH", body: { action } }),

  withdrawDriveInvite: (inviteId: string) =>
    request<{ success: boolean }>(`/drive-invites/${inviteId}/withdraw`, { method: "PATCH", body: {} }),

  /**
   * PATCH /drive-invites/:inviteId/counter
   * TPO sends counter-proposal with modified eligibility terms.
   * Sets invite status → NEGOTIATING.
   */
  sendCounterProposal: (
    inviteId: string,
    proposal: {
      minCgpa?: number;
      maxBacklogs?: number;
      eligibleBranches?: string[];
      eligibleYears?: number[];
      message?: string;
    },
  ) =>
    request<PlacementDriveInvite>(`/drive-invites/${inviteId}/counter`, {
      method: "PATCH",
      body: proposal,
    }),

  /**
   * POST /drive-invites/:inviteId/accept-counter
   * Recruiter accepts the TPO counter-proposal — creates a placement drive with merged terms.
   */
  acceptCounterProposal: (inviteId: string) =>
    request<PlacementDriveInvite>(`/drive-invites/${inviteId}/accept-counter`, { method: "POST" }),

  createDriveRound: (driveId: string, body: Partial<PlacementDriveRound> & { roundType: string }) =>
    request<PlacementDriveRound>(`/placement-drives/${driveId}/rounds`, { method: "POST", body }),

  updateDriveRound: (roundId: string, body: Partial<PlacementDriveRound>) =>
    request<PlacementDriveRound>(`/placement-drives/rounds/${roundId}`, { method: "PATCH", body }),

  deleteDriveRound: (roundId: string) =>
    request<{ success: boolean }>(`/placement-drives/rounds/${roundId}`, { method: "DELETE" }),

  getDriveRounds: (driveId: string, options?: EndpointOptions) =>
    request<PlacementDriveRound[]>(`/placement-drives/${driveId}/rounds`, options),

  shortlistForRound: (roundId: string, applicationIds: string[], updateStatus?: PlacementDriveApplicationStatus) =>
    request<{ success: boolean; count: number }>(`/placement-drives/rounds/${roundId}/shortlist`, { method: "POST", body: { applicationIds, updateStatus } }),

  getCollegeStats: (collegeId: string, year?: number, options?: EndpointOptions) =>
    request<PlacementStats>(`/placement-drives/college/${collegeId}/stats${year ? `?year=${year}` : ""}`, options),
};
