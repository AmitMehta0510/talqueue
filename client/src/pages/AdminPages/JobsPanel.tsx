import React, { useState, FormEvent, useEffect, useRef } from "react";
import {
  Loader2, Briefcase, Plus, Star, Trash2, X, Search, ChevronDown, Check, Building2, RefreshCw
} from "lucide-react";
import {
  useAdminJobsQuery,
  useAdminDeleteJobMutation,
  useAdminUpdateJobMutation,
  useAdminCreateJobMutation,
  useCompaniesQuery,
  useAdminTriggerJobScraperMutation
} from "../../hooks/usePlatformQueries";
import { useToast } from "../../core/contexts/ToastContext";
import { SearchBar, DataTable, StatusBadge, fmtDate } from "./shared";
import { cleanLogoUrl } from "../../core/utils/format";

export function JobsPanel() {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<(string | undefined)[]>([]);

  // Filtering states
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [workModeFilter, setWorkModeFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [featuredFilter, setFeaturedFilter] = useState<string>("");

  const handleSearchChange = (newVal: string) => {
    setQ(newVal);
    setCursor(undefined);
    setHistory([]);
  };

  const query = useAdminJobsQuery(q, cursor);
  const deleteJob = useAdminDeleteJobMutation();
  const updateJob = useAdminUpdateJobMutation();
  const runJobScraper = useAdminTriggerJobScraperMutation();

  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Reset pagination on filter changes
  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setCursor(undefined);
    setHistory([]);
  };
  const handleWorkModeFilterChange = (val: string) => {
    setWorkModeFilter(val);
    setCursor(undefined);
    setHistory([]);
  };
  const handleTypeFilterChange = (val: string) => {
    setTypeFilter(val);
    setCursor(undefined);
    setHistory([]);
  };
  const handleFeaturedFilterChange = (val: string) => {
    setFeaturedFilter(val);
    setCursor(undefined);
    setHistory([]);
  };

  const rawJobs = query.data?.jobs ?? [];

  // Filter jobs client-side to keep pagination simple but support multiple admin filters
  const jobs = rawJobs.filter((j: any) => {
    if (statusFilter && j.status !== statusFilter) return false;
    if (workModeFilter && j.workMode !== workModeFilter) return false;
    if (typeFilter && j.type !== typeFilter) return false;
    if (featuredFilter === "FEATURED" && !j.featured) return false;
    if (featuredFilter === "NORMAL" && j.featured) return false;
    return true;
  });

  const handleToggleFeatured = async (job: any) => {
    try {
      await updateJob.mutateAsync({
        jobId: job.id,
        data: { featured: !job.featured },
      });
    } catch { /* toast handles it */ }
  };

  const handleToggleStatus = async (job: any, nextStatus: string) => {
    try {
      await updateJob.mutateAsync({
        jobId: job.id,
        data: { status: nextStatus },
      });
    } catch { /* toast handles it */ }
  };

  const handleDelete = async (jobId: string) => {
    try {
      await deleteJob.mutateAsync(jobId);
    } catch { /* toast handles it */ }
  };

  return (
    <div className="space-y-4">
      {/* Scraper Control & Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-350">Scraper Control Panel</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Run scrapers to pull and update jobs from Greenhouse, Ashby, and fallbacks.</p>
        </div>
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-teal-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50"
          onClick={() => runJobScraper.mutate()}
          disabled={runJobScraper.isPending}
        >
          {runJobScraper.isPending ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Scraping Platforms...
            </>
          ) : (
            <>
              <RefreshCw size={13} />
              Run Manual Scrape
            </>
          )}
        </button>
      </div>

      {/* Overview stats & post button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-350">Jobs Control Panel</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Post new job openings or moderate and update existing listings.</p>
        </div>
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-teal-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50"
          onClick={() => setIsCreating(true)}
        >
          <Plus size={13} />
          Post New Job
        </button>
      </div>

      {/* Filter and search controls */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 bg-zinc-900/20 p-3 rounded-xl border border-zinc-800/60">
        <div className="lg:col-span-1">
          <SearchBar
            value={q}
            onChange={handleSearchChange}
            placeholder="Search jobs..."
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="w-full h-[38px] rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none transition"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="CLOSED">CLOSED</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ARCHIVED">ARCHIVED</option>
            <option value="DELETED">DELETED</option>
          </select>
        </div>
        <div>
          <select
            value={workModeFilter}
            onChange={(e) => handleWorkModeFilterChange(e.target.value)}
            className="w-full h-[38px] rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none transition"
          >
            <option value="">All Work Modes</option>
            <option value="REMOTE">REMOTE</option>
            <option value="HYBRID">HYBRID</option>
            <option value="ONSITE">ONSITE</option>
          </select>
        </div>
        <div>
          <select
            value={typeFilter}
            onChange={(e) => handleTypeFilterChange(e.target.value)}
            className="w-full h-[38px] rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none transition"
          >
            <option value="">All Job Types</option>
            <option value="FULL_TIME">FULL_TIME</option>
            <option value="INTERNSHIP">INTERNSHIP</option>
            <option value="ENTRY_LEVEL">ENTRY_LEVEL</option>
            <option value="PART_TIME">PART_TIME</option>
            <option value="CONTRACT">CONTRACT</option>
            <option value="FREELANCE">FREELANCE</option>
          </select>
        </div>
        <div>
          <select
            value={featuredFilter}
            onChange={(e) => handleFeaturedFilterChange(e.target.value)}
            className="w-full h-[38px] rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none transition"
          >
            <option value="">All (Featured/Normal)</option>
            <option value="FEATURED">Featured Only</option>
            <option value="NORMAL">Normal Only</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        {query.isPending ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin text-indigo-500" />
          </div>
        ) : (
          <>
            <DataTable
              headers={["Job Detail", "Company", "Type/Mode", "Status", "Featured", "Applications", "Posted At", "Actions"]}
              empty={jobs.length === 0}
            >
              {jobs.map((j: any) => (
                <tr key={j.id} className="transition hover:bg-[var(--bg-surface-2)]">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white max-w-xs truncate">{j.title}</div>
                    {j.location && <div className="text-[10px] text-zinc-550">{j.location}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {cleanLogoUrl(j.company?.logoUrl) ? (
                        <img
                          src={cleanLogoUrl(j.company.logoUrl)!}
                          alt=""
                          className="h-5 w-5 rounded object-contain bg-zinc-800 border border-zinc-700/50"
                        />
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded bg-zinc-800 border border-zinc-700/50 text-[9px] text-zinc-400">
                          <Building2 size={10} />
                        </div>
                      )}
                      <span className="text-zinc-300 font-medium truncate max-w-[120px]">{j.company?.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-zinc-800 text-zinc-400 mr-1.5">{j.type}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{j.workMode}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={j.status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(j)}
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-lg border transition ${
                        j.featured
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                          : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}
                      title={j.featured ? "Featured" : "Click to Feature"}
                      disabled={updateJob.isPending}
                    >
                      <Star size={12} fill={j.featured ? "currentColor" : "none"} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-zinc-300">
                    {j._count?.applications ?? 0}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-[10px] whitespace-nowrap">
                    {fmtDate(j.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {j.status === "DRAFT" && (
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-700/30 hover:bg-indigo-500/20 transition"
                          onClick={() => handleToggleStatus(j, "OPEN")}
                        >
                          Open
                        </button>
                      )}
                      {j.status === "OPEN" && (
                        <button
                          type="button"
                          className="btn-secondary text-[10px] px-2 py-1"
                          onClick={() => handleToggleStatus(j, "CLOSED")}
                        >
                          Close
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-secondary text-[10px] px-2 py-1"
                        onClick={() => setEditingJob(j)}
                      >
                        Edit
                      </button>
                      {j.status !== "DELETED" && (
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-700/30 hover:bg-rose-500/20 transition"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this job? This will be soft-deleted.")) {
                              handleDelete(j.id);
                            }
                          }}
                          disabled={deleteJob.isPending}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
            <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
              <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                Page {history.length + 1}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const prev = history[history.length - 1];
                    setHistory(history.slice(0, -1));
                    setCursor(prev);
                  }}
                  disabled={history.length === 0 || query.isFetching}
                  className="btn-secondary text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHistory([...history, cursor]);
                    setCursor(query.data?.nextCursor || undefined);
                  }}
                  disabled={!query.data?.hasNextPage || query.isFetching}
                  className="btn-secondary text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {editingJob && (
        <EditJobModal
          job={editingJob}
          onClose={() => setEditingJob(null)}
        />
      )}

      {isCreating && (
        <CreateJobModal
          onClose={() => setIsCreating(false)}
        />
      )}
    </div>
  );
}

// ─── EDIT JOB MODAL ────────────────────────────────────────────────────────────
function EditJobModal({ job, onClose }: { job: any; onClose: () => void }) {
  const updateJob = useAdminUpdateJobMutation();
  const { showToast } = useToast();

  const [title, setTitle] = useState(job.title || "");
  const [description, setDescription] = useState(job.description || "");
  const [requirements, setRequirements] = useState(job.requirements || "");
  const [responsibilities, setResponsibilities] = useState(job.responsibilities || "");
  const [perks, setPerks] = useState(job.perks || "");
  const [location, setLocation] = useState(job.location || "");
  const [workMode, setWorkMode] = useState<string>(job.workMode || "REMOTE");
  const [type, setType] = useState<string>(job.type || "FULL_TIME");
  const [experienceLevel, setExperienceLevel] = useState(job.experienceLevel || "");
  const [salaryMin, setSalaryMin] = useState(job.salaryMin !== null && job.salaryMin !== undefined ? String(job.salaryMin) : "");
  const [salaryMax, setSalaryMax] = useState(job.salaryMax !== null && job.salaryMax !== undefined ? String(job.salaryMax) : "");
  const [currency, setCurrency] = useState(job.currency || "INR");
  const [openings, setOpenings] = useState(job.openings !== null && job.openings !== undefined ? String(job.openings) : "");
  const [applyUrl, setApplyUrl] = useState(job.applyUrl || "");
  const [status, setStatus] = useState<string>(job.status || "OPEN");
  const [featured, setFeatured] = useState<boolean>(job.featured || false);

  const [skillsRequiredText, setSkillsRequiredText] = useState((job.skillsRequired || []).join(", "));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast("error", "Title and Description are required");
      return;
    }

    const skillsArray = skillsRequiredText
      .split(",")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    try {
      await updateJob.mutateAsync({
        jobId: job.id,
        data: {
          title,
          description,
          requirements: requirements || null,
          responsibilities: responsibilities || null,
          perks: perks || null,
          location: location || null,
          workMode,
          type,
          experienceLevel: experienceLevel || null,
          salaryMin: salaryMin ? Number(salaryMin) : null,
          salaryMax: salaryMax ? Number(salaryMax) : null,
          currency,
          openings: openings ? Number(openings) : null,
          skillsRequired: skillsArray,
          applyUrl: applyUrl || null,
          status,
          featured,
        },
      });
      onClose();
    } catch { /* toast handles error */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <div className="flex items-center justify-between border-b p-4" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Briefcase size={16} className="text-indigo-400" />
            Edit Job Details
          </h3>
          <button type="button" className="icon-btn h-8 w-8" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Job Title *</label>
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Software Engineer"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Location</label>
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bangalore, India (or Remote)"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Work Mode</label>
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition"
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
              >
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ONSITE">Onsite</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Job Type</label>
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="ENTRY_LEVEL">Entry Level</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="FREELANCE">Freelance</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Status</label>
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="OPEN">OPEN</option>
                <option value="CLOSED">CLOSED</option>
                <option value="DRAFT">DRAFT</option>
                <option value="ARCHIVED">ARCHIVED</option>
                <option value="DELETED">DELETED</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Job Description *</label>
            <textarea
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition h-28 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Full details about the job role..."
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Requirements</label>
              <textarea
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition h-20 resize-none"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Required skills, degree, etc. (markdown/text)"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Responsibilities</label>
              <textarea
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition h-20 resize-none"
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                placeholder="Key day-to-day duties..."
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Salary Min</label>
              <input
                type="number"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                placeholder="e.g. 500000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Salary Max</label>
              <input
                type="number"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                placeholder="e.g. 1000000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Currency</label>
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="INR"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Experience Level</label>
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                placeholder="e.g. 2-5 years"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Openings Count</label>
              <input
                type="number"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition"
                value={openings}
                onChange={(e) => setOpenings(e.target.value)}
                placeholder="e.g. 3"
              />
            </div>
            <div className="space-y-1 flex flex-col justify-end pb-2">
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="rounded border-zinc-750 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
                />
                Mark as Featured
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Required Skills (Comma separated)</label>
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition"
                value={skillsRequiredText}
                onChange={(e) => setSkillsRequiredText(e.target.value)}
                placeholder="React, Node.js, TypeScript"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>External Application URL</label>
              <input
                type="url"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-655 focus:border-indigo-500 focus:outline-none transition"
                value={applyUrl}
                onChange={(e) => setApplyUrl(e.target.value)}
                placeholder="https://company.com/careers/apply"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              className="btn-secondary px-4 py-2 text-xs"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-4 py-2 text-xs disabled:opacity-50"
              disabled={updateJob.isPending}
            >
              {updateJob.isPending && <Loader2 size={12} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── CREATE JOB MODAL WITH AUTOCOMPLETE COMPANY SELECTOR ───────────────────────
function CreateJobModal({ onClose }: { onClose: () => void }) {
  const createJob = useAdminCreateJobMutation();
  const { showToast } = useToast();

  const [companySearch, setCompanySearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [perks, setPerks] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState<string>("REMOTE");
  const [type, setType] = useState<string>("FULL_TIME");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [openings, setOpenings] = useState("");
  const [applyUrl, setApplyUrl] = useState("");
  const [featured, setFeatured] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("OPEN");

  const [skillsRequiredText, setSkillsRequiredText] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Autocomplete company search using companies list query
  const companiesQuery = useCompaniesQuery({ q: companySearch.trim() || undefined, limit: 10 });
  const companies = companiesQuery.data?.companies || [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCompanyDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCompany = (comp: any) => {
    setSelectedCompany(comp);
    setCompanySearch("");
    setShowCompanyDropdown(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) {
      showToast("error", "Please select a company using autocomplete search");
      return;
    }
    if (!title.trim() || !description.trim()) {
      showToast("error", "Title and Description are required");
      return;
    }

    const skillsArray = skillsRequiredText
      .split(",")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    try {
      await createJob.mutateAsync({
        companyId: selectedCompany.id,
        title,
        description,
        requirements: requirements || null,
        responsibilities: responsibilities || null,
        perks: perks || null,
        location: location || null,
        workMode,
        type,
        experienceLevel: experienceLevel || null,
        salaryMin: salaryMin ? Number(salaryMin) : null,
        salaryMax: salaryMax ? Number(salaryMax) : null,
        currency,
        openings: openings ? Number(openings) : null,
        skillsRequired: skillsArray,
        applyUrl: applyUrl || null,
        status,
        featured,
      });
      onClose();
    } catch { /* mutation hook displays Toast */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <div className="flex items-center justify-between border-b p-4" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Plus size={18} className="text-indigo-400" />
            Post New Job (Admin Console)
          </h3>
          <button type="button" className="icon-btn h-8 w-8" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Autocomplete Company Selector */}
          <div ref={dropdownRef} className="space-y-1 relative">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Select Company *</label>
            {selectedCompany ? (
              <div className="flex items-center justify-between rounded-lg border border-indigo-500/30 bg-indigo-500/5 px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  {cleanLogoUrl(selectedCompany.logoUrl) ? (
                    <img src={cleanLogoUrl(selectedCompany.logoUrl)!} alt="" className="h-6 w-6 rounded object-contain" />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800 text-[10px] text-zinc-400">
                      <Building2 size={12} />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-white leading-tight">{selectedCompany.name}</div>
                    {selectedCompany.industry && <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{selectedCompany.industry}</div>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCompany(null)}
                  className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                <input
                  type="text"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 pl-9 py-2 text-sm text-zinc-100 placeholder-zinc-550 focus:border-indigo-500 focus:outline-none transition"
                  placeholder="Type to search and select verified company..."
                  value={companySearch}
                  onChange={(e) => {
                    setCompanySearch(e.target.value);
                    setShowCompanyDropdown(true);
                  }}
                  onFocus={() => setShowCompanyDropdown(true)}
                  required
                />
                {showCompanyDropdown && companySearch.trim().length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border shadow-2xl py-1 animate-in fade-in duration-100" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
                    {companiesQuery.isPending ? (
                      <div className="flex items-center justify-center py-4 text-zinc-500 gap-2 text-xs">
                        <Loader2 size={12} className="animate-spin text-indigo-500" />
                        Searching companies...
                      </div>
                    ) : companies.length === 0 ? (
                      <div className="px-3 py-3 text-center text-xs text-zinc-650 italic">No companies found</div>
                    ) : (
                      companies.map((comp: any) => (
                        <button
                          key={comp.id}
                          type="button"
                          onClick={() => handleSelectCompany(comp)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                        >
                          {cleanLogoUrl(comp.logoUrl) ? (
                            <img src={cleanLogoUrl(comp.logoUrl)!} alt="" className="h-6 w-6 rounded object-contain" />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800 text-[10px] text-zinc-400">
                              <Building2 size={12} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold truncate text-white">{comp.name}</div>
                            {comp.industry && <div className="text-[10px] text-zinc-500 truncate">{comp.industry}</div>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Job Title *</label>
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Senior Fullstack Developer"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Location</label>
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote, or New York, NY"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Work Mode</label>
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition"
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
              >
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ONSITE">Onsite</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Job Type</label>
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="ENTRY_LEVEL">Entry Level</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="FREELANCE">Freelance</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Initial Status</label>
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="OPEN">OPEN</option>
                <option value="CLOSED">CLOSED</option>
                <option value="DRAFT">DRAFT</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Job Description *</label>
            <textarea
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition h-28 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of the role..."
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Requirements</label>
              <textarea
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition h-20 resize-none"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Skills, qualifications, prerequisites..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Responsibilities</label>
              <textarea
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-655 focus:border-indigo-500 focus:outline-none transition h-20 resize-none"
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                placeholder="Key expectations and tasks..."
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Salary Min</label>
              <input
                type="number"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                placeholder="e.g. 60000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Salary Max</label>
              <input
                type="number"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                placeholder="e.g. 120000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Currency</label>
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="INR"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Experience Level</label>
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                placeholder="e.g. Entry Level, Senior"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Openings Count</label>
              <input
                type="number"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none transition"
                value={openings}
                onChange={(e) => setOpenings(e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="space-y-1 flex flex-col justify-end pb-2">
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="rounded border-zinc-750 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
                />
                Mark as Featured
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Required Skills (Comma separated)</label>
              <input
                type="text"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-650 focus:border-indigo-500 focus:outline-none transition"
                value={skillsRequiredText}
                onChange={(e) => setSkillsRequiredText(e.target.value)}
                placeholder="React, CSS, GraphQL"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>External Application URL</label>
              <input
                type="url"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-655 focus:border-indigo-500 focus:outline-none transition"
                value={applyUrl}
                onChange={(e) => setApplyUrl(e.target.value)}
                placeholder="https://company.com/jobs/apply"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              className="btn-secondary px-4 py-2 text-xs"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-4 py-2 text-xs disabled:opacity-50"
              disabled={createJob.isPending}
            >
              {createJob.isPending && <Loader2 size={12} className="animate-spin" />}
              Post Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
