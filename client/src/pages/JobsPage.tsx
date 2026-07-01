import { useState, useMemo, useEffect, useRef, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { Job, User } from "../lib/api";
import {
  useJobsQuery,
  useRecommendedJobsQuery,
  useSavedJobsQuery,
  useMyJobApplicationsQuery,
  useMyExternalApplicationsQuery,
  useRecruiterJobsQuery,
  useSaveJobMutation,
  useMyFullProfileQuery,
  useCompanyEmployeesQuery,
  useJobSkillsAutocompleteQuery,
  useJobLocationsAutocompleteQuery,
} from "../hooks/usePlatformQueries";
import { useAuth } from "../core/contexts/AuthContext";
import { PageLoader } from "../components/ui";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { JobDetailModal } from "../features/jobs/components/JobDetailModal";
import { JobPostModal } from "../components/forms/JobPostModal";
import { ExternalApplyModal } from "../components/forms/ExternalApplyModal";
import { RequestReferralModal } from "../components/forms/RequestReferralModal";

// Child Tab components
import { JobsExploreTab } from "../components/jobs/JobsExploreTab";
import { JobsRecommendedTab } from "../components/jobs/JobsRecommendedTab";
import { JobsSavedTab } from "../components/jobs/JobsSavedTab";
import { JobsApplicationsTab } from "../components/jobs/JobsApplicationsTab";
import { JobsCampusTab } from "../components/jobs/JobsCampusTab";
import { JobsRecruiterTab } from "../components/jobs/JobsRecruiterTab";
import { ROLE_MAPPINGS } from "../components/jobs/JobShared";

const KanbanPipeline = lazy(() => import("../components/recruiter/KanbanPipeline").then(m => ({ default: m.KanbanPipeline })));

type TabType = "explore" | "recommended" | "applications" | "saved" | "recruiter" | "campus-drives";
type SubViewType = { type: "dashboard" } | { type: "pipeline"; jobId: string };

export function JobsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("explore");
  const [recruiterView, setRecruiterView] = useState<SubViewType>({ type: "dashboard" });
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applyModalJob, setApplyModalJob] = useState<Job | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [referralUser, setReferralUser] = useState<User | null>(null);
  const [externalApplyJob, setExternalApplyJob] = useState<Job | null>(null);

  // Pagination
  const [jobPage, setJobPage] = useState(1);
  const jobsPerPage = 20;

  // Filters
  const [searchVal, setSearchVal] = useState("");
  const [selectedWorkModes, setSelectedWorkModes] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [salaryRange, setSalaryRange] = useState<[number, number]>([0, 50]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [searchSkillQ, setSearchSkillQ] = useState("");
  const [searchLocationQ, setSearchLocationQ] = useState("");
  const [stipendRange, setStipendRange] = useState<[number, number]>([0, 50]);
  const [internDuration, setInternDuration] = useState<string | null>(null);
  const [ppoOnly, setPpoOnly] = useState(false);
  const [freshness, setFreshness] = useState<string | null>(null);
  const [unsaveConfirmJobId, setUnsaveConfirmJobId] = useState<string | null>(null);

  const pendingSaveJobId = useRef<string | null>(null);
  const prevTab = useRef(activeTab);

  // Reset pagination on tab/filter change
  useEffect(() => {
    setJobPage(1);
  }, [activeTab, searchVal, selectedWorkModes, selectedJobTypes, selectedSkills, selectedLocations, selectedRoles, freshness]);

  // Queries
  const jobsQuery = useJobsQuery(
    activeTab === "explore"
      ? {
        page: jobPage,
        limit: jobsPerPage,
        search: searchVal || undefined,
        workMode: selectedWorkModes.length ? selectedWorkModes : undefined,
        jobType: selectedJobTypes.length ? selectedJobTypes : undefined,
        skills: selectedSkills.length ? selectedSkills : undefined,
        location: selectedLocations.length ? selectedLocations : undefined,
        roles: selectedRoles.length ? selectedRoles : undefined,
        freshness: freshness || undefined,
      }
      : undefined
  );
  const recommendedQuery = useRecommendedJobsQuery();
  const savedQuery = useSavedJobsQuery();
  const applicationsQuery = useMyJobApplicationsQuery();
  const externalAppsQuery = useMyExternalApplicationsQuery();
  const recruiterJobsQuery = useRecruiterJobsQuery();
  const saveMutation = useSaveJobMutation();
  const profileQuery = useMyFullProfileQuery();
  const skillSuggestionsQuery = useJobSkillsAutocompleteQuery(searchSkillQ);
  const locationSuggestionsQuery = useJobLocationsAutocompleteQuery(searchLocationQ);

  const selectedJobId = selectedJob?.companyId || selectedJob?.company?.id;
  const employeesQuery = useCompanyEmployeesQuery(selectedJobId || "");

  const collegeId = profileQuery.data?.profile?.collegeId;
  const isRecruiter = user?.primaryRole === "RECRUITER";

  const userSkillNames = useMemo(() => {
    return new Set(
      (profileQuery.data?.skills || [])
        .map((s) => s.skill?.name?.toLowerCase().trim())
        .filter((name): name is string => Boolean(name))
    );
  }, [profileQuery.data?.skills]);

  const appliedJobIds = useMemo(
    () => new Set((applicationsQuery.data || []).map((app) => app.jobId)),
    [applicationsQuery.data]
  );
  const savedJobIds = useMemo(
    () => new Set((savedQuery.data || []).map((job) => job.id)),
    [savedQuery.data]
  );

  const handleSaveToggle = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    if (saveMutation.isPending) return;

    const isSaved = savedJobIds.has(jobId);
    if (isSaved) {
      setUnsaveConfirmJobId(jobId);
      return;
    }

    pendingSaveJobId.current = jobId;
    try {
      await saveMutation.mutateAsync(jobId);
    } catch {
      /* toasted */
    } finally {
      pendingSaveJobId.current = null;
    }
  };

  const toggleWorkMode = (m: string) => setSelectedWorkModes((cur) => cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]);
  const toggleJobType = (t: string) => setSelectedJobTypes((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]);
  const toggleRole = (r: string) => setSelectedRoles((cur) => cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]);
  const toggleSkill = (s: string) => setSelectedSkills((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
  const toggleLocation = (l: string) => setSelectedLocations((cur) => cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]);

  const clearFilters = () => {
    setSearchVal(""); setSelectedWorkModes([]); setSelectedJobTypes([]);
    setSalaryRange([0, 50]); setSelectedRoles([]); setSelectedSkills([]);
    setSelectedLocations([]); setSearchSkillQ(""); setSearchLocationQ("");
    setFreshness(null);
    setJobPage(1); setStipendRange([0, 50]); setInternDuration(null); setPpoOnly(false);
  };

  const getSource = () => {
    switch (activeTab) {
      case "explore": return { list: jobsQuery.data?.jobs || [], loading: jobsQuery.isLoading, error: jobsQuery.isError, refetch: jobsQuery.refetch };
      case "recommended": return { list: recommendedQuery.data || [], loading: recommendedQuery.isLoading, error: recommendedQuery.isError, refetch: recommendedQuery.refetch };
      case "saved": return { list: savedQuery.data || [], loading: savedQuery.isLoading, error: savedQuery.isError, refetch: savedQuery.refetch };
      case "applications": return { list: (applicationsQuery.data || []).map((a) => a.job).filter(Boolean) as Job[], loading: applicationsQuery.isLoading, error: applicationsQuery.isError, refetch: applicationsQuery.refetch };
      default: return { list: [], loading: false, error: false, refetch: () => { } };
    }
  };

  const source = getSource();

  const filteredJobs = useMemo(() => {
    let resultList: Job[] = [];

    if (activeTab === "explore") {
      resultList = jobsQuery.data?.jobs || [];
    } else {
      resultList = source.list.filter((job) => {
        const q = searchVal.trim().toLowerCase();
        const matchQ = !q || [job.title, job.description, job.company?.name].join(" ").toLowerCase().includes(q);
        const matchW = !selectedWorkModes.length || selectedWorkModes.includes(job.workMode || "");
        const matchT = !selectedJobTypes.length || selectedJobTypes.includes(job.type || "");
        const minSalaryLpa = salaryRange[0] * 100000;
        const maxSalaryLpa = salaryRange[1] * 100000;
        const hasNoSalaryDetails = job.salaryMin == null && job.salaryMax == null;
        const matchS =
          hasNoSalaryDetails || (
            (!minSalaryLpa || (job.salaryMax != null && job.salaryMax >= minSalaryLpa)) &&
            (salaryRange[1] >= 50 || (job.salaryMin != null && job.salaryMin <= maxSalaryLpa))
          );
        const matchR = !selectedRoles.length || selectedRoles.some((roleName) => {
          const keywords = ROLE_MAPPINGS[roleName] || [];
          const titleLower = (job.title || "").toLowerCase();
          return keywords.some((kw) => titleLower.includes(kw));
        });
        const matchSkills = !selectedSkills.length || (job.skillsRequired || []).some((jobSkill) =>
          selectedSkills.some((selected) => selected.toLowerCase().trim() === jobSkill.toLowerCase().trim())
        );
        const matchLoc = !selectedLocations.length || (job.location && selectedLocations.includes(job.location.trim()));
        const isInternshipTab = selectedJobTypes.includes("INTERNSHIP") || (selectedJobTypes.length === 0 && false);
        const matchStipend = !isInternshipTab || (() => {
          if (stipendRange[0] === 0 && stipendRange[1] >= 50) return true;
          const minStipend = stipendRange[0] * 1000;
          const maxStipend = stipendRange[1] * 1000;
          if (job.salaryMin == null && job.salaryMax == null) return true;
          return (!minStipend || (job.salaryMax != null && job.salaryMax >= minStipend)) &&
            (stipendRange[1] >= 50 || (job.salaryMin != null && job.salaryMin <= maxStipend));
        })();
        const matchPpo = !ppoOnly || job.ppoOffered === true;
        return matchQ && matchW && matchT && matchS && matchR && matchSkills && matchLoc && matchStipend && matchPpo;
      });
    }

    const getSortMetrics = (job: Job) => {
      const jobSkills = (job.skillsRequired || []) as string[];
      let matchPercent = 0;
      if (jobSkills.length > 0 && userSkillNames.size > 0) {
        const matching = jobSkills.filter((s) => userSkillNames.has(s.toLowerCase().trim()));
        matchPercent = (matching.length / jobSkills.length) * 100;
      } else if (jobSkills.length === 0) {
        matchPercent = 100;
      }

      const loc = (job.location || "").toLowerCase();
      const isIndia = loc.includes("india") ||
                      loc.includes("bengaluru") ||
                      loc.includes("bangalore") ||
                      loc.includes("pune") ||
                      loc.includes("mumbai") ||
                      loc.includes("delhi") ||
                      loc.includes("noida") ||
                      loc.includes("gurgaon") ||
                      loc.includes("gurugram") ||
                      loc.includes("chennai") ||
                      loc.includes("hyderabad") ||
                      loc.includes("kolkata");

      const typeLower = (job.type || "").toLowerCase();
      const titleLower = (job.title || "").toLowerCase();
      const expLevelLower = (job.experienceLevel || "").toLowerCase();
      const isInternOrFresher = typeLower === "internship" ||
                                typeLower === "entry_level" ||
                                expLevelLower === "entry level" ||
                                expLevelLower === "internship" ||
                                /\b(intern|fresher|new\s*grad|associate|junior)\b/.test(titleLower);

      return {
        matchPercent,
        isIndia: isIndia ? 1 : 0,
        isInternOrFresher: isInternOrFresher ? 1 : 0
      };
    };

    return [...resultList].sort((a, b) => {
      const metricsA = getSortMetrics(a);
      const metricsB = getSortMetrics(b);

      if (metricsB.matchPercent !== metricsA.matchPercent) {
        return metricsB.matchPercent - metricsA.matchPercent;
      }
      if (metricsB.isIndia !== metricsA.isIndia) {
        return metricsB.isIndia - metricsA.isIndia;
      }
      if (metricsB.isInternOrFresher !== metricsA.isInternOrFresher) {
        return metricsB.isInternOrFresher - metricsA.isInternOrFresher;
      }
      
      const featA = a.featured ? 1 : 0;
      const featB = b.featured ? 1 : 0;
      if (featB !== featA) return featB - featA;

      const dateA = new Date(a.postedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.postedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [
    activeTab,
    jobsQuery.data?.jobs,
    source.list,
    searchVal,
    selectedWorkModes,
    selectedJobTypes,
    salaryRange,
    selectedRoles,
    selectedSkills,
    selectedLocations,
    stipendRange,
    ppoOnly,
    userSkillNames,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const jobIdParam = params.get("jobId");

    if (filteredJobs.length > 0) {
      if (jobIdParam) {
        const matched = filteredJobs.find((j) => j.id === jobIdParam);
        if (matched) {
          setSelectedJob(matched);
          return;
        }
      }

      const tabChanged = prevTab.current !== activeTab;
      prevTab.current = activeTab;

      if (tabChanged) {
        setSelectedJob(filteredJobs[0]);
      } else {
        const isStillInList = filteredJobs.some((j) => j.id === selectedJob?.id);
        if (!isStillInList) setSelectedJob(filteredJobs[0]);
      }
    } else {
      setSelectedJob(null);
    }
  }, [filteredJobs, activeTab, location.search]);

  if (activeTab === "recruiter" && recruiterView.type === "pipeline") {
    return (
      <Suspense fallback={<PageLoader />}>
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

  return (
    <div className="space-y-0">

      {/* ── Tab nav bar ── */}
      <div className="mb-4 panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${activeTab === key
                  ? "bg-blue-600 text-white"
                  : "hover:bg-[color:var(--bg-surface-2)]"
                }`}
              style={activeTab !== key ? { color: "var(--text-secondary)" } : {}}
            >
              {label}
            </button>
          ))}
        </div>
        {activeTab === "recruiter" && (
          <button type="button" className="btn-primary" onClick={() => setShowPostModal(true)}>
            <Plus size={15} /> Post a Job
          </button>
        )}
      </div>

      {/* Tab Panels */}
      {activeTab === "campus-drives" && (
        <JobsCampusTab collegeId={collegeId || undefined} />
      )}

      {activeTab === "recruiter" && (
        <JobsRecruiterTab
          isLoading={recruiterJobsQuery.isLoading}
          isError={recruiterJobsQuery.isError}
          recruiterJobs={recruiterJobsQuery.data || []}
          onRetry={() => recruiterJobsQuery.refetch()}
          onViewPipeline={(jobId) => setRecruiterView({ type: "pipeline", jobId })}
          onViewDetails={(job) => setApplyModalJob(job)}
        />
      )}

      {activeTab === "applications" && (
        <JobsApplicationsTab
          isLoading={applicationsQuery.isLoading || externalAppsQuery.isLoading}
          platformApps={(applicationsQuery.data || []).map((a) => ({
            id: a.id,
            jobId: a.jobId,
            status: a.status ?? "APPLIED",
            createdAt: a.createdAt || new Date().toISOString(),
            job: a.job,
          }))}
          externalApps={externalAppsQuery.data || []}
        />
      )}

      {activeTab === "explore" && (
        <JobsExploreTab
          selectedWorkModes={selectedWorkModes}
          toggleWorkMode={toggleWorkMode}
          selectedJobTypes={selectedJobTypes}
          toggleJobType={toggleJobType}
          salaryRange={salaryRange}
          setSalaryRange={setSalaryRange}
          stipendRange={stipendRange}
          setStipendRange={setStipendRange}
          internDuration={internDuration}
          setInternDuration={setInternDuration}
          ppoOnly={ppoOnly}
          setPpoOnly={setPpoOnly}
          freshness={freshness}
          setFreshness={setFreshness}
          selectedRoles={selectedRoles}
          toggleRole={toggleRole}
          selectedSkills={selectedSkills}
          toggleSkill={toggleSkill}
          searchSkillQ={searchSkillQ}
          setSearchSkillQ={setSearchSkillQ}
          skillSuggestions={skillSuggestionsQuery.data || []}
          isSkillSuggestionsLoading={skillSuggestionsQuery.isLoading}
          selectedLocations={selectedLocations}
          toggleLocation={toggleLocation}
          searchLocationQ={searchLocationQ}
          setSearchLocationQ={setSearchLocationQ}
          locationSuggestions={locationSuggestionsQuery.data || []}
          isLocationSuggestionsLoading={locationSuggestionsQuery.isLoading}
          clearFilters={clearFilters}
          searchVal={searchVal}
          setSearchVal={setSearchVal}
          filteredJobs={filteredJobs}
          isLoading={source.loading}
          isError={source.error}
          refetch={source.refetch}
          totalJobs={jobsQuery.data?.total ?? 0}
          totalPages={jobsQuery.data?.totalPages || 1}
          jobPage={jobPage}
          setJobPage={setJobPage}
          selectedJob={selectedJob}
          setSelectedJob={setSelectedJob}
          appliedJobIds={appliedJobIds}
          savedJobIds={savedJobIds}
          isSavePending={saveMutation.isPending}
          pendingSaveJobId={pendingSaveJobId.current}
          onSaveToggle={handleSaveToggle}
          userSkillNames={userSkillNames}
          isRecruiter={!!isRecruiter}
          onApply={(job) => setApplyModalJob(job)}
          onExternalApply={(job) => setExternalApplyJob(job)}
          onRequestReferral={(u) => setReferralUser(u)}
          employees={employeesQuery.data?.employees || []}
          isEmployeesLoading={employeesQuery.isLoading}
          isEmployeesFetching={employeesQuery.isFetching}
        />
      )}

      {activeTab === "recommended" && (
        <JobsRecommendedTab
          selectedWorkModes={selectedWorkModes}
          toggleWorkMode={toggleWorkMode}
          selectedJobTypes={selectedJobTypes}
          toggleJobType={toggleJobType}
          salaryRange={salaryRange}
          setSalaryRange={setSalaryRange}
          stipendRange={stipendRange}
          setStipendRange={setStipendRange}
          internDuration={internDuration}
          setInternDuration={setInternDuration}
          ppoOnly={ppoOnly}
          setPpoOnly={setPpoOnly}
          freshness={freshness}
          setFreshness={setFreshness}
          selectedRoles={selectedRoles}
          toggleRole={toggleRole}
          selectedSkills={selectedSkills}
          toggleSkill={toggleSkill}
          searchSkillQ={searchSkillQ}
          setSearchSkillQ={setSearchSkillQ}
          skillSuggestions={skillSuggestionsQuery.data || []}
          isSkillSuggestionsLoading={skillSuggestionsQuery.isLoading}
          selectedLocations={selectedLocations}
          toggleLocation={toggleLocation}
          searchLocationQ={searchLocationQ}
          setSearchLocationQ={setSearchLocationQ}
          locationSuggestions={locationSuggestionsQuery.data || []}
          isLocationSuggestionsLoading={locationSuggestionsQuery.isLoading}
          clearFilters={clearFilters}
          searchVal={searchVal}
          setSearchVal={setSearchVal}
          jobs={filteredJobs}
          isLoading={source.loading}
          isError={source.error}
          refetch={source.refetch}
          selectedJob={selectedJob}
          setSelectedJob={setSelectedJob}
          appliedJobIds={appliedJobIds}
          savedJobIds={savedJobIds}
          isSavePending={saveMutation.isPending}
          pendingSaveJobId={pendingSaveJobId.current}
          onSaveToggle={handleSaveToggle}
          userSkillNames={userSkillNames}
          isRecruiter={!!isRecruiter}
          onApply={(job) => setApplyModalJob(job)}
          onExternalApply={(job) => setExternalApplyJob(job)}
          onRequestReferral={(u) => setReferralUser(u)}
          employees={employeesQuery.data?.employees || []}
          isEmployeesLoading={employeesQuery.isLoading}
          isEmployeesFetching={employeesQuery.isFetching}
        />
      )}

      {activeTab === "saved" && (
        <JobsSavedTab
          selectedWorkModes={selectedWorkModes}
          toggleWorkMode={toggleWorkMode}
          selectedJobTypes={selectedJobTypes}
          toggleJobType={toggleJobType}
          salaryRange={salaryRange}
          setSalaryRange={setSalaryRange}
          stipendRange={stipendRange}
          setStipendRange={setStipendRange}
          internDuration={internDuration}
          setInternDuration={setInternDuration}
          ppoOnly={ppoOnly}
          setPpoOnly={setPpoOnly}
          freshness={freshness}
          setFreshness={setFreshness}
          selectedRoles={selectedRoles}
          toggleRole={toggleRole}
          selectedSkills={selectedSkills}
          toggleSkill={toggleSkill}
          searchSkillQ={searchSkillQ}
          setSearchSkillQ={setSearchSkillQ}
          skillSuggestions={skillSuggestionsQuery.data || []}
          isSkillSuggestionsLoading={skillSuggestionsQuery.isLoading}
          selectedLocations={selectedLocations}
          toggleLocation={toggleLocation}
          searchLocationQ={searchLocationQ}
          setSearchLocationQ={setSearchLocationQ}
          locationSuggestions={locationSuggestionsQuery.data || []}
          isLocationSuggestionsLoading={locationSuggestionsQuery.isLoading}
          clearFilters={clearFilters}
          searchVal={searchVal}
          setSearchVal={setSearchVal}
          jobs={filteredJobs}
          isLoading={source.loading}
          isError={source.error}
          refetch={source.refetch}
          selectedJob={selectedJob}
          setSelectedJob={setSelectedJob}
          appliedJobIds={appliedJobIds}
          savedJobIds={savedJobIds}
          isSavePending={saveMutation.isPending}
          pendingSaveJobId={pendingSaveJobId.current}
          onSaveToggle={handleSaveToggle}
          userSkillNames={userSkillNames}
          isRecruiter={!!isRecruiter}
          onApply={(job) => setApplyModalJob(job)}
          onExternalApply={(job) => setExternalApplyJob(job)}
          onRequestReferral={(u) => setReferralUser(u)}
          employees={employeesQuery.data?.employees || []}
          isEmployeesLoading={employeesQuery.isLoading}
          isEmployeesFetching={employeesQuery.isFetching}
        />
      )}

      {/* Modals */}
      {applyModalJob && (
        <JobDetailModal
          job={applyModalJob}
          onClose={() => setApplyModalJob(null)}
          hasAppliedAlready={appliedJobIds.has(applyModalJob.id)}
        />
      )}
      {showPostModal && (
        <JobPostModal
          onClose={() => setShowPostModal(false)}
          onSuccess={() => recruiterJobsQuery.refetch()}
        />
      )}
      {referralUser && (
        <RequestReferralModal
          targetUser={referralUser}
          companyNameDefault={selectedJob?.company?.name || ""}
          onClose={() => setReferralUser(null)}
        />
      )}
      {externalApplyJob && (
        <ExternalApplyModal
          job={externalApplyJob}
          onClose={() => setExternalApplyJob(null)}
        />
      )}
      {unsaveConfirmJobId && (
        <ConfirmDialog
          open={!!unsaveConfirmJobId}
          title="Unsave Job?"
          message="Are you sure you want to remove this job from your saved jobs?"
          confirmLabel="Unsave"
          cancelLabel="Cancel"
          variant="danger"
          isPending={saveMutation.isPending}
          onConfirm={async () => {
            if (unsaveConfirmJobId) {
              pendingSaveJobId.current = unsaveConfirmJobId;
              try {
                await saveMutation.mutateAsync(unsaveConfirmJobId);
              } catch {
                /* toasted */
              } finally {
                pendingSaveJobId.current = null;
                setUnsaveConfirmJobId(null);
              }
            }
          }}
          onCancel={() => setUnsaveConfirmJobId(null)}
        />
      )}
    </div>
  );
}
