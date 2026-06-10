import { useState, useMemo } from "react";
import {
  Briefcase,
  BriefcaseBusiness,
  Search,
  Filter,
  Plus,
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  Eye,
  Settings,
  MapPin,
  Clock,
  IndianRupee,
  X,
  ChevronRight,
  Star,
  Building2,
  Zap,
  Loader2,
  ArrowLeft,
  ExternalLink,
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
import { JobDetailModal } from "../components/cards/JobDetailModal";
import { JobPostModal } from "../components/forms/JobPostModal";
import { KanbanPipeline } from "../components/recruiter/KanbanPipeline";
import { formatCount, formatDate, titleCase } from "../lib/format";

type TabType = "explore" | "recommended" | "applications" | "saved" | "recruiter";
type SubViewType = { type: "dashboard" } | { type: "pipeline"; jobId: string };

// ---------------------------------------------------------------------------
// Salary formatter (Indian-style ₹ LPA)
// ---------------------------------------------------------------------------
function formatSalary(min?: number | null, max?: number | null) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 100000
      ? `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)} LPA`
      : `₹${formatCount(n)}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  return `From ${fmt(min!)}`;
}

// ---------------------------------------------------------------------------
// Active filter chips
// ---------------------------------------------------------------------------
function ActiveFilters({
  workModes,
  jobTypes,
  minSalary,
  onRemoveWorkMode,
  onRemoveJobType,
  onClearSalary,
  onClearAll,
}: {
  workModes: string[];
  jobTypes: string[];
  minSalary: string;
  onRemoveWorkMode: (m: string) => void;
  onRemoveJobType: (t: string) => void;
  onClearSalary: () => void;
  onClearAll: () => void;
}) {
  const hasAny = workModes.length > 0 || jobTypes.length > 0 || minSalary;
  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-slate-500">Applied:</span>
      {workModes.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onRemoveWorkMode(m)}
          className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
        >
          {titleCase(m)} <X size={10} />
        </button>
      ))}
      {jobTypes.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onRemoveJobType(t)}
          className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
        >
          {titleCase(t)} <X size={10} />
        </button>
      ))}
      {minSalary && (
        <button
          type="button"
          onClick={onClearSalary}
          className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition"
        >
          ₹{formatCount(Number(minSalary))}+ <X size={10} />
        </button>
      )}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-semibold text-slate-400 hover:text-rose-500 transition ml-1"
      >
        Clear all
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Naukri-style Job Row Card
// ---------------------------------------------------------------------------
function JobRowCard({
  job,
  isSelected,
  hasApplied,
  isSaved,
  onSelect,
  onSaveToggle,
  isRecruiter,
}: {
  job: Job;
  isSelected: boolean;
  hasApplied: boolean;
  isSaved: boolean;
  onSelect: () => void;
  onSaveToggle: (e: React.MouseEvent) => void;
  isRecruiter: boolean;
}) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const WORK_MODE_COLOR: Record<string, string> = {
    REMOTE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    HYBRID: "bg-blue-50 text-blue-700 border-blue-200",
    ON_SITE: "bg-slate-50 text-slate-600 border-slate-200",
  };

  return (
    <article
      onClick={onSelect}
      className={`group cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md ${
        isSelected
          ? "border-blue-400 bg-blue-50/40 shadow-sm"
          : "border-slate-200 bg-white hover:border-blue-300"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Company logo */}
        <div className="shrink-0">
          {job.company?.logoUrl ? (
            <img
              src={job.company.logoUrl}
              alt={job.company.name}
              className="h-11 w-11 rounded-lg object-cover border border-slate-100"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Building2 size={20} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
                {job.title}
              </h3>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                {job.company?.name || "Company"}
              </p>
            </div>

            {/* Save button */}
            {!isRecruiter && (
              <button
                type="button"
                onClick={onSaveToggle}
                className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                title={isSaved ? "Remove saved" : "Save job"}
              >
                {isSaved ? (
                  <BookmarkCheck size={16} className="text-blue-600" />
                ) : (
                  <Bookmark size={16} />
                )}
              </button>
            )}
          </div>

          {/* Meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {job.location}
              </span>
            )}
            {job.experienceLevel && (
              <span className="flex items-center gap-1">
                <Briefcase size={11} />
                {titleCase(job.experienceLevel)}
              </span>
            )}
            {salary && (
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <IndianRupee size={11} />
                {salary}
              </span>
            )}
            {job.createdAt && (
              <span className="flex items-center gap-1 text-slate-400">
                <Clock size={11} />
                {formatDate(job.createdAt)}
              </span>
            )}
          </div>

          {/* Badges */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {job.workMode && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${WORK_MODE_COLOR[job.workMode] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}
              >
                {titleCase(job.workMode)}
              </span>
            )}
            {job.type && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {titleCase(job.type)}
              </span>
            )}
            {hasApplied && (
              <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <CheckCircle size={10} /> Applied
              </span>
            )}
            {job.applicationsCount != null && (
              <span className="ml-auto text-[10px] text-slate-400">
                {formatCount(job.applicationsCount)} applicants
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Naukri-style right-side Job Detail Drawer
// ---------------------------------------------------------------------------
function JobDetailDrawer({
  job,
  hasApplied,
  onClose,
  onApply,
}: {
  job: Job;
  hasApplied: boolean;
  onClose: () => void;
  onApply: () => void;
}) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 bg-white px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {job.company?.logoUrl ? (
              <img
                src={job.company.logoUrl}
                alt={job.company.name}
                className="h-12 w-12 rounded-lg object-cover border border-slate-100"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Building2 size={22} />
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-slate-900">{job.title}</h2>
              <p className="text-sm font-semibold text-blue-700">{job.company?.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition"
          >
            <X size={15} />
          </button>
        </div>

        {/* Quick facts */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
          {job.location && <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>}
          {salary && <span className="flex items-center gap-1 font-semibold text-slate-800"><IndianRupee size={11} />{salary}</span>}
          {job.workMode && <span className="flex items-center gap-1"><Briefcase size={11} />{titleCase(job.workMode)}</span>}
          {job.type && <span className="flex items-center gap-1"><Clock size={11} />{titleCase(job.type)}</span>}
          {job.experienceLevel && <span className="flex items-center gap-1"><Star size={11} />{titleCase(job.experienceLevel)}</span>}
        </div>

        {/* CTA */}
        <div className="mt-4 flex gap-2">
          {hasApplied ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 border border-emerald-200">
              <CheckCircle size={15} /> Already Applied
            </div>
          ) : (
            <button
              type="button"
              onClick={onApply}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              <Zap size={14} /> Apply Now
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {job.description && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Job Description</h3>
            <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{job.description}</p>
          </div>
        )}
        {(job.skillsRequired || []).length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Skills Required</h3>
            <div className="flex flex-wrap gap-1.5">
              {(job.skillsRequired as string[]).map((s, i) => (
                <span key={i} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
        {job.createdAt && (
          <p className="text-xs text-slate-400">
            Posted {formatDate(job.createdAt)} · {formatCount(job.applicationsCount ?? 0)} applicants
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main JobsPage
// ---------------------------------------------------------------------------

export function JobsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("explore");
  const [recruiterView, setRecruiterView] = useState<SubViewType>({ type: "dashboard" });
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applyModalJob, setApplyModalJob] = useState<Job | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  // Filters
  const [searchVal, setSearchVal] = useState("");
  const [selectedWorkModes, setSelectedWorkModes] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [minSalary, setMinSalary] = useState("");

  // Queries
  const jobsQuery = useJobsQuery();
  const recommendedQuery = useRecommendedJobsQuery();
  const savedQuery = useSavedJobsQuery();
  const applicationsQuery = useMyJobApplicationsQuery();
  const recruiterJobsQuery = useRecruiterJobsQuery();
  const saveMutation = useSaveJobMutation();

  const isRecruiter = user?.primaryRole === "RECRUITER";

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
    try { await saveMutation.mutateAsync(jobId); } catch { /* toasted */ }
  };

  const toggleWorkMode = (m: string) =>
    setSelectedWorkModes((cur) => cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]);
  const toggleJobType = (t: string) =>
    setSelectedJobTypes((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]);
  const clearFilters = () => {
    setSearchVal(""); setSelectedWorkModes([]); setSelectedJobTypes([]); setMinSalary("");
  };

  const getSource = () => {
    switch (activeTab) {
      case "explore":       return { list: jobsQuery.data || [], loading: jobsQuery.isLoading, error: jobsQuery.isError, refetch: jobsQuery.refetch };
      case "recommended":   return { list: recommendedQuery.data || [], loading: recommendedQuery.isLoading, error: recommendedQuery.isError, refetch: recommendedQuery.refetch };
      case "saved":         return { list: savedQuery.data || [], loading: savedQuery.isLoading, error: savedQuery.isError, refetch: savedQuery.refetch };
      case "applications":  return { list: (applicationsQuery.data || []).map((a) => a.job).filter(Boolean) as Job[], loading: applicationsQuery.isLoading, error: applicationsQuery.isError, refetch: applicationsQuery.refetch };
      default:              return { list: [], loading: false, error: false, refetch: () => {} };
    }
  };

  const source = getSource();
  const filteredJobs = useMemo(() =>
    source.list.filter((job) => {
      const q = searchVal.trim().toLowerCase();
      const matchQ = !q || [job.title, job.description, job.company?.name].join(" ").toLowerCase().includes(q);
      const matchW = !selectedWorkModes.length || selectedWorkModes.includes(job.workMode || "");
      const matchT = !selectedJobTypes.length || selectedJobTypes.includes(job.type || "");
      const matchS = !minSalary || (job.salaryMax != null && (job.salaryMax || 0) >= Number(minSalary));
      return matchQ && matchW && matchT && matchS;
    }),
    [source.list, searchVal, selectedWorkModes, selectedJobTypes, minSalary]
  );

  // Kanban pipeline full-page view
  if (activeTab === "recruiter" && recruiterView.type === "pipeline") {
    return (
      <KanbanPipeline
        jobId={recruiterView.jobId}
        onBack={() => setRecruiterView({ type: "dashboard" })}
      />
    );
  }

  const TABS: { key: TabType; label: string }[] = [
    { key: "explore", label: "Explore Jobs" },
    ...(user ? [
      { key: "recommended" as TabType, label: "Recommended" },
      { key: "applications" as TabType, label: "My Applications" },
      { key: "saved" as TabType, label: "Saved" },
    ] : []),
    ...(isRecruiter ? [{ key: "recruiter" as TabType, label: "Recruiter" }] : []),
  ];

  return (
    <div className="space-y-0">
      {/* ── Naukri-style top nav bar ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap gap-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                activeTab === key
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
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

      {/* ── Recruiter dashboard ── */}
      {activeTab === "recruiter" ? (
        recruiterJobsQuery.isLoading ? (
          <div className="flex justify-center py-12"><InlineLoader label="Loading your jobs…" /></div>
        ) : recruiterJobsQuery.isError ? (
          <ErrorState title="Couldn't load your posted jobs" text="Please try again." onRetry={() => recruiterJobsQuery.refetch()} />
        ) : (recruiterJobsQuery.data || []).length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {(recruiterJobsQuery.data || []).map((job) => (
              <article key={job.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <BriefcaseBusiness size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{job.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {[job.location, titleCase(job.workMode), titleCase(job.type)].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-xs font-bold text-blue-600 mt-1">{job.applicationsCount || 0} applicants</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button type="button" className="btn-secondary py-1 px-3 text-xs"
                    onClick={() => setRecruiterView({ type: "pipeline", jobId: job.id })}>
                    <Settings size={12} /> Pipeline
                  </button>
                  <button type="button" className="btn-primary py-1 px-3 text-xs"
                    onClick={() => setApplyModalJob(job)}>
                    <Eye size={12} /> Details
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={BriefcaseBusiness} title="No jobs posted yet" text="Click 'Post a Job' to start finding talent." />
        )
      ) : (
        /* ── Candidate view: Naukri 3-col split layout ── */
        <div className="grid gap-4 lg:grid-cols-[14rem_1fr_1fr]">
          {/* ── Filters sidebar ── */}
          <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 space-y-5 lg:sticky lg:top-[100px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                <Filter size={14} /> Filters
              </span>
              <button type="button" onClick={clearFilters} className="text-xs font-semibold text-slate-400 hover:text-rose-500 transition">
                Clear all
              </button>
            </div>

            {/* Work mode */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Work Mode</p>
              <div className="space-y-2">
                {["REMOTE", "HYBRID", "ON_SITE"].map((m) => (
                  <label key={m} className="flex cursor-pointer items-center gap-2.5 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 accent-blue-600"
                      checked={selectedWorkModes.includes(m)}
                      onChange={() => toggleWorkMode(m)}
                    />
                    {titleCase(m)}
                  </label>
                ))}
              </div>
            </div>

            {/* Job type */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Job Type</p>
              <div className="space-y-2">
                {["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT"].map((t) => (
                  <label key={t} className="flex cursor-pointer items-center gap-2.5 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 accent-blue-600"
                      checked={selectedJobTypes.includes(t)}
                      onChange={() => toggleJobType(t)}
                    />
                    {titleCase(t)}
                  </label>
                ))}
              </div>
            </div>

            {/* Min salary */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Min Salary (₹/year)</p>
              <div className="relative">
                <IndianRupee className="absolute left-2.5 top-2.5 text-slate-400" size={12} />
                <input
                  type="number"
                  className="field py-1.5 pl-7 text-xs"
                  placeholder="e.g. 500000"
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                />
              </div>
            </div>
          </aside>

          {/* ── Job list ── */}
          <div className="space-y-3 min-w-0">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
              <input
                type="text"
                className="field w-full py-2.5 pl-10 text-sm"
                placeholder="Search jobs by title, company, skills…"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
              />
            </div>

            {/* Active filter chips */}
            <ActiveFilters
              workModes={selectedWorkModes}
              jobTypes={selectedJobTypes}
              minSalary={minSalary}
              onRemoveWorkMode={(m) => toggleWorkMode(m)}
              onRemoveJobType={(t) => toggleJobType(t)}
              onClearSalary={() => setMinSalary("")}
              onClearAll={clearFilters}
            />

            {/* Results count */}
            {!source.loading && (
              <p className="text-xs font-semibold text-slate-500">
                {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"} found
              </p>
            )}

            {source.loading ? (
              <div className="flex justify-center py-10"><InlineLoader label="Searching jobs…" /></div>
            ) : source.error ? (
              <ErrorState title="Couldn't load jobs" text="Check your connection and try again." onRetry={source.refetch} />
            ) : filteredJobs.length > 0 ? (
              <div className="space-y-2.5">
                {filteredJobs.map((job) => (
                  <JobRowCard
                    key={job.id}
                    job={job}
                    isSelected={selectedJob?.id === job.id}
                    hasApplied={appliedJobIds.has(job.id)}
                    isSaved={savedJobIds.has(job.id)}
                    onSelect={() => setSelectedJob(job)}
                    onSaveToggle={(e) => handleSaveToggle(e, job.id)}
                    isRecruiter={!!isRecruiter}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BriefcaseBusiness}
                title="No jobs match your filters"
                text="Try adjusting the filters on the left or changing your search term."
              />
            )}
          </div>

          {/* ── Job detail drawer (right col) ── */}
          <div className="min-w-0">
            {selectedJob ? (
              <div className="lg:sticky lg:top-[100px]">
                <JobDetailDrawer
                  job={selectedJob}
                  hasApplied={appliedJobIds.has(selectedJob.id)}
                  onClose={() => setSelectedJob(null)}
                  onApply={() => setApplyModalJob(selectedJob)}
                />
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-center px-6">
                <BriefcaseBusiness size={28} className="text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-400">Select a job to view details</p>
                <p className="text-xs text-slate-300 mt-1">Click any job card on the left</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Apply modal (reuses existing JobDetailModal for the actual apply flow) */}
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
    </div>
  );
}
