import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, GraduationCap, Search } from "lucide-react";
import {
  useRecruiterDashboardQuery,
  useRecruiterInsightsQuery,
  useRecruiterJobsQuery,
  useDriveInvitesForCompanyQuery,
  useInboundDriveInvitesForCompanyQuery,
  useWithdrawDriveInviteMutation,
  useRespondToDriveInviteMutation,
  useMyPostedDrivesQuery,
  useMyClaimStatusQuery,
  useRecruiterClaimJobApplicationsQuery,
  useUpdateApplicationStatusMutation,
  useResdexSearchQuery,
} from "../hooks/usePlatformQueries";

import { useAuth } from "../core/contexts/AuthContext";
import { InlineLoader, ErrorState, PageLoader } from "../components/ui";

const DriveApplicantsModal = lazy(() => import("../components/jobs/DriveApplicantsModal").then(m => ({ default: m.DriveApplicantsModal })));
const KanbanPipeline = lazy(() => import("../components/jobs/KanbanPipeline").then(m => ({ default: m.KanbanPipeline })));

import { JobPostModal } from "../components/forms/JobPostModal";
import { DriveInviteModal } from "../components/jobs/DriveInviteModal";

// Presentational components
import { RecruiterJobsTab } from "../components/recruiter/RecruiterJobsTab";
import { RecruiterAppsTab } from "../components/recruiter/RecruiterAppsTab";
import { RecruiterClaimStatusTab } from "../components/recruiter/RecruiterClaimStatusTab";
import { RecruiterCampusTab } from "../components/recruiter/RecruiterCampusTab";
import { RecruiterSearchTab } from "../components/recruiter/RecruiterSearchTab";

export function RecruiterPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"claim" | "jobs" | "apps" | "campus" | "search">("jobs");
  const navigate = useNavigate();
  const [managedJobId, setManagedJobId] = useState<string | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showDriveInviteModal, setShowDriveInviteModal] = useState(false);
  const [selectedDriveForApplicants, setSelectedDriveForApplicants] = useState<{ id: string; title: string } | null>(null);

  // For Applications tab
  const [selectedJobIdForApps, setSelectedJobIdForApps] = useState<string>("");

  // Resdex search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSkills, setSearchSkills] = useState<string[]>([]);
  const [searchMinCgpa, setSearchMinCgpa] = useState<number | undefined>(undefined);
  const [searchGradYear, setSearchGradYear] = useState<number | undefined>(undefined);
  const [searchCollegeName, setSearchCollegeName] = useState("");
  const [searchCompanyName, setSearchCompanyName] = useState("");

  const searchFilters = useMemo(() => ({
    query: searchQuery || undefined,
    skills: searchSkills.length > 0 ? searchSkills : undefined,
    minCgpa: searchMinCgpa,
    graduationYear: searchGradYear,
    collegeName: searchCollegeName || undefined,
    companyName: searchCompanyName || undefined,
  }), [searchQuery, searchSkills, searchMinCgpa, searchGradYear, searchCollegeName, searchCompanyName]);

  const resdexQuery = useResdexSearchQuery(searchFilters, activeTab === "search");

  const dashboardQuery = useRecruiterDashboardQuery();
  const insightsQuery = useRecruiterInsightsQuery();
  const jobsQuery = useRecruiterJobsQuery();
  const claimStatusQuery = useMyClaimStatusQuery(activeTab === "claim");

  // Detect the recruiter's primary company
  const recruiterCompany = useMemo(() => {
    const experiences = (user as any)?.experiences || [];
    const adminRoles = (user as any)?.companyAdminships || (user as any)?.companyAdmins || [];
    return adminRoles[0]?.company || experiences[0]?.company || null;
  }, [user]);

  const companyId = recruiterCompany?.id as string | undefined;
  const driveInvitesQuery = useDriveInvitesForCompanyQuery(companyId);
  const inboundInvitesQuery = useInboundDriveInvitesForCompanyQuery(companyId);
  const inboundInvites = inboundInvitesQuery.data || [];
  const withdrawInviteMutation = useWithdrawDriveInviteMutation(companyId);
  const respondToInviteMutation = useRespondToDriveInviteMutation(null);
  const myPostedDrivesQuery = useMyPostedDrivesQuery();
  const postedDrives = useMemo(() => myPostedDrivesQuery.data || [], [myPostedDrivesQuery.data]);

  const activeJobs = useMemo(() => jobsQuery.data || [], [jobsQuery.data]);

  // Applications Query
  const appsQuery = useRecruiterClaimJobApplicationsQuery(
    selectedJobIdForApps,
    undefined,
    activeTab === "apps" && Boolean(selectedJobIdForApps)
  );
  const updateAppMutation = useUpdateApplicationStatusMutation(selectedJobIdForApps);

  // Set default selected job in Applications tab when jobs load
  useEffect(() => {
    if (activeJobs.length > 0 && !selectedJobIdForApps) {
      setSelectedJobIdForApps(activeJobs[0].id);
    }
  }, [activeJobs, selectedJobIdForApps]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalJobs = activeJobs.length;
    const totalApplicants = activeJobs.reduce((acc, job) => acc + (job.applicationsCount || 0), 0);
    const avgMatchRate = 78;
    return { totalJobs, totalApplicants, avgMatchRate };
  }, [activeJobs]);

  const totalStudentsEngaged = useMemo(() => {
    return postedDrives.reduce((sum: number, drive: any) => sum + (drive._count?.applications ?? drive.applicationsCount ?? 0), 0);
  }, [postedDrives]);

  const conversionRatio = useMemo(() => {
    return "12.5%";
  }, []);

  const handleUpdateAppStatus = async (appId: string, status: string, notes?: string) => {
    await updateAppMutation.mutateAsync({ appId, status, recruiterNotes: notes });
  };

  const handleRespondToInvite = async (payload: { inviteId: string; action: "ACCEPT" | "REJECT" }) => {
    await respondToInviteMutation.mutateAsync(payload);
  };

  const handleWithdrawInvite = async (inviteId: string) => {
    await withdrawInviteMutation.mutateAsync(inviteId);
  };

  const loading = dashboardQuery.isLoading || insightsQuery.isLoading || jobsQuery.isLoading || myPostedDrivesQuery.isLoading;
  const isError = dashboardQuery.isError || insightsQuery.isError || jobsQuery.isError || myPostedDrivesQuery.isError;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <InlineLoader label="Loading Recruiter Dashboard..." />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load recruiter data"
        onRetry={() => {
          dashboardQuery.refetch();
          insightsQuery.refetch();
          jobsQuery.refetch();
        }}
      />
    );
  }

  // Render Kanban subview if managing candidate pipeline
  if (managedJobId) {
    return (
      <div className="space-y-4">
        <Suspense fallback={<PageLoader />}>
          <KanbanPipeline jobId={managedJobId} onBack={() => setManagedJobId(null)} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-2" style={{ borderColor: "var(--border)" }}>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Recruiter Console</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Evaluate engineering applicants, track fit ratios, and coordinate pipeline updates.
          </p>
        </div>

        <button
          className="btn-primary py-1.5 px-4 text-xs font-semibold"
          type="button"
          onClick={() => setShowPostModal(true)}
        >
          <Plus size={15} />
          Post New Job
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex space-x-6 border-b" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => setActiveTab("jobs")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "jobs"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          My Jobs
        </button>
        <button
          onClick={() => setActiveTab("apps")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "apps"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Applications
        </button>
        <button
          onClick={() => setActiveTab("claim")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "claim"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Claim Status
        </button>
        <button
          onClick={() => setActiveTab("campus")}
          className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "campus"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <GraduationCap size={14} />
          Campus Drives
          {postedDrives.length > 0 && (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-500 px-1 text-[9px] font-bold text-white">
              {postedDrives.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("search")}
          className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "search"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Search size={14} />
          Talent Search (Resdex)
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "jobs" && (
        <RecruiterJobsTab
          jobs={activeJobs}
          stats={stats}
          onManageCandidates={(jobId) => setManagedJobId(jobId)}
        />
      )}

      {activeTab === "apps" && (
        <RecruiterAppsTab
          jobs={activeJobs}
          selectedJobId={selectedJobIdForApps}
          onSelectedJobIdChange={setSelectedJobIdForApps}
          applications={appsQuery.data?.applications}
          isLoading={appsQuery.isLoading}
          onUpdateStatus={handleUpdateAppStatus}
          isUpdating={updateAppMutation.isPending}
        />
      )}

      {activeTab === "claim" && (
        <RecruiterClaimStatusTab
          claims={claimStatusQuery.data}
          isLoading={claimStatusQuery.isLoading}
        />
      )}

      {activeTab === "campus" && (
        <RecruiterCampusTab
          inboundInvites={inboundInvites}
          isInboundInvitesLoading={inboundInvitesQuery.isLoading}
          onRespondToInvite={handleRespondToInvite}
          isRespondToInvitePending={respondToInviteMutation.isPending}
          sentInvites={driveInvitesQuery.data || []}
          isSentInvitesLoading={driveInvitesQuery.isLoading}
          onWithdrawInvite={handleWithdrawInvite}
          isWithdrawInvitePending={withdrawInviteMutation.isPending}
          onSendCampusInviteClick={() => setShowDriveInviteModal(true)}
          hasCompanyId={Boolean(companyId)}
          activeDrives={postedDrives}
          isActiveDrivesLoading={myPostedDrivesQuery.isLoading}
          onNavigateToDrive={(driveId) => navigate(`/recruiter/drive/${driveId}`)}
          totalStudentsEngaged={totalStudentsEngaged}
          conversionRatio={conversionRatio}
        />
      )}

      {activeTab === "search" && (
        <RecruiterSearchTab
          candidates={resdexQuery.data?.candidates}
          searchLimitInfo={resdexQuery.data?.searchLimitInfo}
          isLoading={resdexQuery.isLoading}
          isError={resdexQuery.isError}
          onRetry={() => resdexQuery.refetch()}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchSkills={searchSkills}
          setSearchSkills={setSearchSkills}
          searchMinCgpa={searchMinCgpa}
          setSearchMinCgpa={setSearchMinCgpa}
          searchGradYear={searchGradYear}
          setSearchGradYear={setSearchGradYear}
          searchCollegeName={searchCollegeName}
          setSearchCollegeName={setSearchCollegeName}
          searchCompanyName={searchCompanyName}
          setSearchCompanyName={setSearchCompanyName}
        />
      )}

      {showPostModal && (
        <JobPostModal
          onClose={() => setShowPostModal(false)}
          onSuccess={() => {
            jobsQuery.refetch();
            dashboardQuery.refetch();
          }}
        />
      )}

      {showDriveInviteModal && companyId && (
        <DriveInviteModal
          companyId={companyId}
          companyName={recruiterCompany?.name || "Your Company"}
          onClose={() => setShowDriveInviteModal(false)}
        />
      )}

      {selectedDriveForApplicants && (
        <Suspense fallback={null}>
          <DriveApplicantsModal
            driveId={selectedDriveForApplicants.id}
            driveTitle={selectedDriveForApplicants.title}
            onClose={() => setSelectedDriveForApplicants(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
