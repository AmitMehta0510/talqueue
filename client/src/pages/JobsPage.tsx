import { useState, useMemo } from "react";
import {
  BriefcaseBusiness,
  Search,
  Filter,
  Plus,
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  Eye,
  Settings,
  DollarSign,
} from "lucide-react";
import { Job } from "../lib/api";
import {
  useJobsQuery,
  useRecommendedJobsQuery,
  useSavedJobsQuery,
  useMyJobApplicationsQuery,
  useRecruiterJobsQuery,
  useSaveJobMutation,
} from "../hooks/usePlatformQueries";
import { useAuth } from "../contexts/AuthContext";
import { EmptyState, InlineLoader, ErrorState } from "../components/ui";
import { JobCard } from "../components/cards/JobCard";
import { JobDetailModal } from "../components/cards/JobDetailModal";
import { JobPostModal } from "../components/forms/JobPostModal";
import { KanbanPipeline } from "../components/recruiter/KanbanPipeline";
import { titleCase } from "../lib/format";

type TabType = "explore" | "recommended" | "applications" | "saved" | "recruiter";
type SubViewType = { type: "dashboard" } | { type: "pipeline"; jobId: string };

export function JobsPage() {
  const { user } = useAuth();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TabType>("explore");

  // Recruiter subview: dashboard list or candidate pipeline Kanban
  const [recruiterView, setRecruiterView] = useState<SubViewType>({ type: "dashboard" });

  // Modal display states
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  // Search & filter state
  const [searchVal, setSearchVal] = useState("");
  const [selectedWorkModes, setSelectedWorkModes] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [minSalary, setMinSalary] = useState("");

  // API Queries
  const jobsQuery = useJobsQuery();
  const recommendedQuery = useRecommendedJobsQuery();
  const savedQuery = useSavedJobsQuery();
  const applicationsQuery = useMyJobApplicationsQuery();
  const recruiterJobsQuery = useRecruiterJobsQuery();
  const saveMutation = useSaveJobMutation();

  const isRecruiter = user?.primaryRole === "RECRUITER";

  // Check application status
  const appliedJobIds = useMemo(() => {
    const apps = applicationsQuery.data || [];
    return new Set(apps.map((app) => app.jobId));
  }, [applicationsQuery.data]);

  // Check saved status
  const savedJobIds = useMemo(() => {
    const saved = savedQuery.data || [];
    return new Set(saved.map((job) => job.id));
  }, [savedQuery.data]);

  const handleSaveToggle = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    try {
      await saveMutation.mutateAsync(jobId);
    } catch {
      // Handled by hook toast
    }
  };

  const toggleWorkMode = (mode: string) => {
    setSelectedWorkModes((current) =>
      current.includes(mode) ? current.filter((m) => m !== mode) : [...current, mode]
    );
  };

  const toggleJobType = (type: string) => {
    setSelectedJobTypes((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    );
  };

  const clearFilters = () => {
    setSearchVal("");
    setSelectedWorkModes([]);
    setSelectedJobTypes([]);
    setMinSalary("");
  };

  // Get active query list based on selected tab
  const getJobsSource = () => {
    switch (activeTab) {
      case "explore":
        return {
          list: jobsQuery.data || [],
          loading: jobsQuery.isLoading,
          error: jobsQuery.isError,
          refetch: jobsQuery.refetch,
        };
      case "recommended":
        return {
          list: recommendedQuery.data || [],
          loading: recommendedQuery.isLoading,
          error: recommendedQuery.isError,
          refetch: recommendedQuery.refetch,
        };
      case "saved":
        return {
          list: savedQuery.data || [],
          loading: savedQuery.isLoading,
          error: savedQuery.isError,
          refetch: savedQuery.refetch,
        };
      case "applications":
        return {
          list: (applicationsQuery.data || []).map((app) => app.job).filter(Boolean) as Job[],
          loading: applicationsQuery.isLoading,
          error: applicationsQuery.isError,
          refetch: applicationsQuery.refetch,
        };
      default:
        return { list: [], loading: false, error: false, refetch: () => {} };
    }
  };

  const source = getJobsSource();

  // Filter jobs locally for maximum interactive speed
  const filteredJobs = useMemo(() => {
    return source.list.filter((job) => {
      const matchesSearch =
        !searchVal.trim() ||
        (job.title || "").toLowerCase().includes(searchVal.toLowerCase()) ||
        (job.description || "").toLowerCase().includes(searchVal.toLowerCase()) ||
        (job.company?.name || "").toLowerCase().includes(searchVal.toLowerCase());

      const matchesWorkMode =
        selectedWorkModes.length === 0 || selectedWorkModes.includes(job.workMode || "");

      const matchesJobType =
        selectedJobTypes.length === 0 || selectedJobTypes.includes(job.type || "");

      const matchesMinSalary =
        !minSalary || (job.salaryMax !== null && (job.salaryMax || 0) >= Number(minSalary));

      return matchesSearch && matchesWorkMode && matchesJobType && matchesMinSalary;
    });
  }, [source.list, searchVal, selectedWorkModes, selectedJobTypes, minSalary]);

  if (activeTab === "recruiter" && recruiterView.type === "pipeline") {
    return (
      <KanbanPipeline
        jobId={recruiterView.jobId}
        onBack={() => setRecruiterView({ type: "dashboard" })}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap gap-1">
          <button
            className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${
              activeTab === "explore"
                ? "bg-emerald-50 text-emerald-800"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }`}
            onClick={() => setActiveTab("explore")}
          >
            Explore Jobs
          </button>
          {user && (
            <>
              <button
                className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${
                  activeTab === "recommended"
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
                onClick={() => setActiveTab("recommended")}
              >
                Recommended
              </button>
              <button
                className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${
                  activeTab === "applications"
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
                onClick={() => setActiveTab("applications")}
              >
                My Applications
              </button>
              <button
                className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${
                  activeTab === "saved"
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
                onClick={() => setActiveTab("saved")}
              >
                Saved Jobs
              </button>
            </>
          )}
          {isRecruiter && (
            <button
              className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${
                activeTab === "recruiter"
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
              onClick={() => setActiveTab("recruiter")}
            >
              Recruiter Dashboard
            </button>
          )}
        </div>

        {activeTab === "recruiter" && (
          <button
            className="btn-primary py-1.5 px-3.5 text-xs font-semibold"
            type="button"
            onClick={() => setShowPostModal(true)}
          >
            <Plus size={15} />
            Post a Job
          </button>
        )}
      </div>

      {activeTab === "recruiter" ? (
        /* Recruiter Dashboard list view */
        recruiterJobsQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <InlineLoader label="Loading posted jobs..." />
          </div>
        ) : recruiterJobsQuery.isError ? (
          <ErrorState
            title="Failed to load your posted jobs"
            text={recruiterJobsQuery.error?.message}
            onRetry={() => recruiterJobsQuery.refetch()}
          />
        ) : recruiterJobsQuery.data && recruiterJobsQuery.data.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {recruiterJobsQuery.data.map((job) => (
              <article className="panel p-5 space-y-4" key={job.id}>
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                    <BriefcaseBusiness size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-slate-950">
                      {job.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {job.location || "Remote"} &bull; {titleCase(job.workMode || "")} &bull; {titleCase(job.type || "")}
                    </p>
                    <p className="text-xs text-emerald-700 font-semibold mt-1">
                      {job.applicationsCount || 0} Applicants
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    className="btn-secondary py-1 px-3 text-xs"
                    type="button"
                    onClick={() => setRecruiterView({ type: "pipeline", jobId: job.id })}
                  >
                    <Settings size={13} />
                    Pipeline Kanban
                  </button>
                  <button
                    className="btn-primary py-1 px-3 text-xs"
                    type="button"
                    onClick={() => setSelectedJob(job)}
                  >
                    <Eye size={13} />
                    View Details
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BriefcaseBusiness}
            title="No jobs posted yet"
            text="You have not created any job listings. Click 'Post a Job' above to start finding talent."
          />
        )
      ) : (
        /* Candidates Explore/Filter View */
        <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
          {/* Filters Sidebar */}
          <aside className="panel p-5 space-y-5 h-fit lg:sticky lg:top-[120px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-sm text-slate-950 flex items-center gap-1.5">
                <Filter size={15} />
                Filters
              </span>
              <button
                className="text-xxs font-semibold text-slate-500 hover:text-emerald-700 transition"
                onClick={clearFilters}
                type="button"
              >
                Clear all
              </button>
            </div>

            {/* Work Mode Checklist */}
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Work Mode
              </span>
              <div className="space-y-1.5">
                {["REMOTE", "HYBRID", "ON_SITE"].map((mode) => (
                  <label key={mode} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-slate-950 transition">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      checked={selectedWorkModes.includes(mode)}
                      onChange={() => toggleWorkMode(mode)}
                    />
                    <span>{titleCase(mode)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Job Type Checklist */}
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Job Type
              </span>
              <div className="space-y-1.5">
                {["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT"].map((type) => (
                  <label key={type} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-slate-950 transition">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      checked={selectedJobTypes.includes(type)}
                      onChange={() => toggleJobType(type)}
                    />
                    <span>{titleCase(type)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Min Salary Input */}
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Min Annual Salary
              </span>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                <input
                  type="number"
                  className="field pl-7 py-1 text-xs"
                  placeholder="e.g. 500000"
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                />
              </div>
            </div>
          </aside>

          {/* Job Feed List */}
          <div className="space-y-5">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 text-slate-400" size={17} />
              <input
                type="text"
                className="field pl-10 pr-4 py-2.5 shadow-sm text-sm"
                placeholder="Search jobs by title, company, skills..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
              />
            </div>

            {source.loading ? (
              <div className="flex justify-center py-12">
                <InlineLoader label="Loading jobs list..." />
              </div>
            ) : source.error ? (
              <ErrorState
                title="Failed to load jobs"
                onRetry={source.refetch}
              />
            ) : filteredJobs.length > 0 ? (
              <div className="grid gap-4">
                {filteredJobs.map((job) => {
                  const hasApplied = appliedJobIds.has(job.id);
                  const isSaved = savedJobIds.has(job.id);

                  return (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className="cursor-pointer relative hover:scale-[1.005] active:scale-100 transition-all duration-150"
                    >
                      <JobCard job={job} />

                      {/* Header Overlays on card for quick actions */}
                      <div className="absolute right-5 top-5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {hasApplied && (
                          <span className="chip text-emerald-800 bg-emerald-50 border-emerald-100 flex items-center gap-1">
                            <CheckCircle size={12} />
                            Applied
                          </span>
                        )}
                        {user && !isRecruiter && (
                          <button
                            onClick={(e) => handleSaveToggle(e, job.id)}
                            className="rounded-full p-1.5 hover:bg-slate-100 text-slate-400 hover:text-emerald-700 transition"
                            type="button"
                            title={isSaved ? "Unsave job" : "Save job"}
                          >
                            {isSaved ? (
                              <BookmarkCheck size={18} className="text-emerald-700" />
                            ) : (
                              <Bookmark size={18} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={BriefcaseBusiness}
                title="No matching jobs found"
                text="Try altering your search term or adjusting filter values in the sidebar."
              />
            )}
          </div>
        </div>
      )}

      {/* Details & Apply Modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          hasAppliedAlready={appliedJobIds.has(selectedJob.id)}
        />
      )}

      {/* Post a Job Modal (Recruiters only) */}
      {showPostModal && (
        <JobPostModal
          onClose={() => setShowPostModal(false)}
          onSuccess={() => recruiterJobsQuery.refetch()}
        />
      )}
    </div>
  );
}
