import { lazy, Suspense } from "react";
import { Plus } from "lucide-react";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { JobDetailModal } from "./JobDetailModal";
import { JobPostModal } from "../forms/JobPostModal";
import { ExternalApplyModal } from "../forms/ExternalApplyModal";
import { RequestReferralModal } from "../forms/RequestReferralModal";

// Child Tab components
import { JobsExploreTab } from "./JobsExploreTab";
import { JobsRecommendedTab } from "./JobsRecommendedTab";
import { JobsSavedTab } from "./JobsSavedTab";
import { JobsApplicationsTab } from "./JobsApplicationsTab";
import { JobsCampusTab } from "./JobsCampusTab";
import { JobsRecruiterTab } from "./JobsRecruiterTab";
import { useJobsWorkspace, TabType } from "../../hooks/useJobsWorkspace";
import { Job, User } from "../../lib/api";

const KanbanPipeline = lazy(() => import("./KanbanPipeline").then(m => ({ default: m.KanbanPipeline })));

export function JobsPageContent() {
  const {
    user,
    activeTab,
    setActiveTab,
    recruiterView,
    setRecruiterView,
    selectedJob,
    setSelectedJob,
    applyModalJob,
    setApplyModalJob,
    showPostModal,
    setShowPostModal,
    referralUser,
    setReferralUser,
    externalApplyJob,
    setExternalApplyJob,
    jobPage,
    setJobPage,
    searchVal,
    setSearchVal,
    selectedWorkModes,
    selectedJobTypes,
    salaryRange,
    setSalaryRange,
    selectedRoles,
    selectedSkills,
    selectedLocations,
    searchSkillQ,
    setSearchSkillQ,
    searchLocationQ,
    setSearchLocationQ,
    stipendRange,
    setStipendRange,
    internDuration,
    setInternDuration,
    ppoOnly,
    setPpoOnly,
    freshness,
    setFreshness,
    unsaveConfirmJobId,
    setUnsaveConfirmJobId,
    pendingSaveJobId,
    jobsQuery,
    applicationsQuery,
    externalAppsQuery,
    recruiterJobsQuery,
    saveMutation,
    source,
    skillSuggestionsQuery,
    locationSuggestionsQuery,
    employeesQuery,
    collegeId,
    isRecruiter,
    userSkillNames,
    appliedJobIds,
    savedJobIds,
    handleSaveToggle,
    toggleWorkMode,
    toggleJobType,
    toggleRole,
    toggleSkill,
    toggleLocation,
    clearFilters,
    filteredJobs,
    handleConfirmUnsave,
    handlePostJobSuccess,
    totalPages,
  } = useJobsWorkspace();

  if (activeTab === "recruiter" && recruiterView.type === "pipeline") {
    return (
      <Suspense fallback={null}>
        <KanbanPipeline
          jobId={recruiterView.jobId}
          onBack={() => setRecruiterView({ type: "dashboard" })}
        />
      </Suspense>
    );
  }

  const TABS: { key: TabType; label: string }[] = [
    { key: "explore", label: "Explore Jobs" },
    ...(user ? [
      { key: "recommended" as TabType, label: "Recommended" },
      { key: "applications" as TabType, label: "My Applications" },
      { key: "saved" as TabType, label: "Saved" },
      { key: "campus-drives" as TabType, label: "Campus Drives" },
    ] : []),
    ...(isRecruiter ? [{ key: "recruiter" as TabType, label: "Recruiter" }] : []),
  ];

  const commonTabProps = {
    selectedWorkModes,
    toggleWorkMode,
    selectedJobTypes,
    toggleJobType,
    salaryRange,
    setSalaryRange,
    stipendRange,
    setStipendRange,
    internDuration,
    setInternDuration,
    ppoOnly,
    setPpoOnly,
    freshness,
    setFreshness,
    selectedRoles,
    toggleRole,
    selectedSkills,
    toggleSkill,
    searchSkillQ,
    setSearchSkillQ,
    skillSuggestions: skillSuggestionsQuery.data || [],
    isSkillSuggestionsLoading: skillSuggestionsQuery.isLoading,
    selectedLocations,
    toggleLocation,
    searchLocationQ,
    setSearchLocationQ,
    locationSuggestions: locationSuggestionsQuery.data || [],
    isLocationSuggestionsLoading: locationSuggestionsQuery.isLoading,
    clearFilters,
    searchVal,
    setSearchVal,
    isLoading: source.loading,
    isError: source.error,
    refetch: source.refetch,
    selectedJob,
    setSelectedJob,
    appliedJobIds,
    savedJobIds,
    isSavePending: saveMutation.isPending,
    pendingSaveJobId: pendingSaveJobId.current,
    onSaveToggle: handleSaveToggle,
    userSkillNames,
    isRecruiter: !!isRecruiter,
    onApply: (job: Job) => setApplyModalJob(job),
    onExternalApply: (job: Job) => setExternalApplyJob(job),
    onRequestReferral: (u: User) => setReferralUser(u),
    employees: employeesQuery.data?.employees || [],
    isEmployeesLoading: employeesQuery.isLoading,
    isEmployeesFetching: employeesQuery.isFetching,
  };

  return (
    <div className="space-y-6">
      {/* Header section with page title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-primary">Jobs Marketplace</h1>
          <p className="text-xs text-muted mt-0.5">Explore open positions, check referrals status, and verify application cycles</p>
        </div>
        {isRecruiter && activeTab === "recruiter" && (
          <button
            onClick={() => setShowPostModal(true)}
            className="btn-primary inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus size={16} />
            Post a Job
          </button>
        )}
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-[color:var(--border)] overflow-x-auto scrollbar-none sticky top-0 bg-[color:var(--bg-surface)] z-10 -mx-6 px-6">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            id={`jobs-tab-${key}`}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === key
                ? "border-brand text-brand"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tabs bodies */}
      <div>
        {activeTab === "explore" && (
          <JobsExploreTab
            {...commonTabProps}
            filteredJobs={filteredJobs}
            totalJobs={jobsQuery.data?.total ?? 0}
            totalPages={totalPages}
            jobPage={jobPage}
            setJobPage={setJobPage}
          />
        )}

        {activeTab === "recommended" && (
          <JobsRecommendedTab
            {...commonTabProps}
            jobs={filteredJobs}
          />
        )}

        {activeTab === "saved" && (
          <JobsSavedTab
            {...commonTabProps}
            jobs={filteredJobs}
          />
        )}

        {activeTab === "applications" && (
          <JobsApplicationsTab
            isLoading={applicationsQuery.isLoading || externalAppsQuery.isLoading}
            platformApps={(applicationsQuery.data || []).map((app) => ({
              id: app.id,
              jobId: app.jobId || "",
              status: app.status || "APPLIED",
              createdAt: app.createdAt ? String(app.createdAt) : new Date().toISOString(),
              job: app.job,
            }))}
            externalApps={externalAppsQuery.data || []}
          />
        )}

        {activeTab === "campus-drives" && collegeId && (
          <JobsCampusTab
            collegeId={collegeId}
          />
        )}

        {activeTab === "recruiter" && (
          <JobsRecruiterTab
            recruiterJobs={recruiterJobsQuery.data || []}
            isLoading={recruiterJobsQuery.isLoading}
            isError={recruiterJobsQuery.isError}
            onRetry={() => recruiterJobsQuery.refetch()}
            onViewPipeline={(jobId) => setRecruiterView({ type: "pipeline", jobId })}
            onViewDetails={(job) => setSelectedJob(job)}
          />
        )}
      </div>

      {/* Modals & Dialogs */}
      {applyModalJob && (
        <JobDetailModal
          job={applyModalJob}
          onClose={() => setApplyModalJob(null)}
          hasAppliedAlready={appliedJobIds.has(applyModalJob.id)}
        />
      )}

      {externalApplyJob && (
        <ExternalApplyModal
          job={externalApplyJob}
          onClose={() => setExternalApplyJob(null)}
        />
      )}

      {referralUser && (
        <RequestReferralModal
          targetUser={referralUser}
          companyNameDefault={selectedJob?.company?.name || ""}
          onClose={() => setReferralUser(null)}
        />
      )}

      {showPostModal && (
        <JobPostModal
          onClose={() => setShowPostModal(false)}
          onSuccess={handlePostJobSuccess}
        />
      )}

      <ConfirmDialog
        open={unsaveConfirmJobId !== null}
        title="Remove Saved Job"
        message="Are you sure you want to remove this job from your saved list?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        isPending={saveMutation.isPending}
        onConfirm={handleConfirmUnsave}
        onCancel={() => setUnsaveConfirmJobId(null)}
      />
    </div>
  );
}
export default JobsPageContent;
