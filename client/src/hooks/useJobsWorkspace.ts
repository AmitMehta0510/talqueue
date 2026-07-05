import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useUrlState } from "../core/utils/useUrlState";
import { Job, User } from "../lib/api";
import { useAuth } from "../core/contexts/AuthContext";
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
} from "./usePlatformQueries";

export type TabType = "explore" | "recommended" | "applications" | "saved" | "recruiter" | "offers";
export type SubViewType = { type: "dashboard" } | { type: "pipeline"; jobId: string };

export function useJobsWorkspace() {
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
  const [selectedJobTypes, setSelectedJobTypes] = useUrlState<string[]>("jobType", [], {
    serialize: (val) => val.join(","),
    deserialize: (str) => str ? str.split(",") : []
  });
  const [experience, setExperience] = useUrlState<string>("experience", "");
  const [salaryRange, setSalaryRange] = useUrlState<[number, number]>("salary", [0, 50], {
    serialize: (val) => `${val[0]}-${val[1]}`,
    deserialize: (str) => {
      const parts = str.split("-").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return [parts[0], parts[1]] as [number, number];
      }
      return [0, 50];
    }
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useUrlState<string[]>("skills", [], {
    serialize: (val) => val.join(","),
    deserialize: (str) => str ? str.split(",") : []
  });
  const [selectedLocations, setSelectedLocations] = useUrlState<string[]>("location", [], {
    serialize: (val) => val.join(","),
    deserialize: (str) => str ? str.split(",") : []
  });
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
  // IMPORTANT: selectedJobTypes, selectedSkills, selectedLocations come from useUrlState
  // and return a NEW array reference on every render (deserialized from URL string).
  // Using them directly as deps would reset page on every render. 
  // So we serialize them to stable strings for comparison.
  useEffect(() => {
    setJobPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    searchVal,
    selectedWorkModes.join(","),
    selectedJobTypes.join(","),
    selectedSkills.join(","),
    selectedLocations.join(","),
    selectedRoles.join(","),
    freshness,
  ]);

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
    setExperience("");
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
      resultList = source.list;
    }

    return resultList.filter((job) => {
      // Experience Level filter
      if (experience) {
        if (experience === "entry" && job.experienceLevel && !["entry", "associate"].includes(job.experienceLevel.toLowerCase())) return false;
        if (experience === "mid" && job.experienceLevel && !["mid_level", "mid"].includes(job.experienceLevel.toLowerCase())) return false;
        if (experience === "senior" && job.experienceLevel && !["senior", "director", "executive"].includes(job.experienceLevel.toLowerCase())) return false;
      }

      // Salary Range filter
      if (job.salaryMin !== null && job.salaryMin !== undefined) {
        if (job.salaryMin < salaryRange[0] || job.salaryMin > salaryRange[1]) return false;
      } else if (job.salaryMax !== null && job.salaryMax !== undefined) {
        if (job.salaryMax < salaryRange[0] || job.salaryMax > salaryRange[1]) return false;
      }

      // Job Type (for non-explore tabs since API handles it for explore)
      if (activeTab !== "explore" && selectedJobTypes.length) {
        if (!job.type || !selectedJobTypes.includes(job.type)) return false;
      }

      // Work Mode (for non-explore tabs)
      if (activeTab !== "explore" && selectedWorkModes.length) {
        if (!job.workMode || !selectedWorkModes.includes(job.workMode)) return false;
      }

      // Location (for non-explore tabs)
      if (activeTab !== "explore" && selectedLocations.length) {
        if (!job.location || !selectedLocations.some((loc) => job.location?.toLowerCase().includes(loc.toLowerCase()))) return false;
      }

      // Stipend Range
      if (job.type === "INTERNSHIP" && stipendRange[1] < 50) {
        const minStipend = job.salaryMin || 0;
        if (minStipend < stipendRange[0] * 1000 || minStipend > stipendRange[1] * 1000) return false;
      }

      // Internship Duration
      if (job.type === "INTERNSHIP" && internDuration) {
        // Simple mock duration check or parsing if schema supports
      }

      // PPO Offered
      if (ppoOnly && !job.ppoOffered) return false;

      return true;
    });
  }, [activeTab, source.list, jobsQuery.data?.jobs, experience, salaryRange, selectedJobTypes, selectedWorkModes, selectedLocations, stipendRange, internDuration, ppoOnly]);

  const handleConfirmUnsave = async () => {
    if (!unsaveConfirmJobId) return;
    try {
      await saveMutation.mutateAsync(unsaveConfirmJobId);
    } catch {
      // toasted
    } finally {
      setUnsaveConfirmJobId(null);
    }
  };

  const handlePostJobSuccess = () => {
    setShowPostModal(false);
    recruiterJobsQuery.refetch();
  };

  return {
    user,
    location,
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
    jobsPerPage,
    searchVal,
    setSearchVal,
    selectedWorkModes,
    selectedJobTypes,
    experience,
    setExperience,
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
    prevTab,
    jobsQuery,
    recommendedQuery,
    savedQuery,
    applicationsQuery,
    externalAppsQuery,
    recruiterJobsQuery,
    saveMutation,
    source,
    profileQuery,
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
    totalPages: jobsQuery.data?.totalPages || 0,
  };
}
