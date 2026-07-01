import { BriefcaseBusiness, Users, Sparkles, FolderKanban, CheckCircle, Clock } from "lucide-react";
import { EmptyState } from "../ui";
import { titleCase } from "../../core/utils/format";
import { Job } from "../../lib/api";

interface RecruiterJobsTabProps {
  jobs: Job[];
  stats: {
    totalJobs: number;
    totalApplicants: number;
    avgMatchRate: number;
  };
  onManageCandidates: (jobId: string) => void;
}

export function RecruiterJobsTab({ jobs, stats, onManageCandidates }: RecruiterJobsTabProps) {
  return (
    <div className="space-y-6">
      {/* Recruiter Stats Overview Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-5 flex items-center gap-4 bg-gradient-to-br from-indigo-50/40 dark:from-indigo-900/10 to-teal-50/40 dark:to-teal-900/10">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400">
            <BriefcaseBusiness size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stats.totalJobs}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Active Job Postings</div>
          </div>
        </div>

        <div className="panel p-5 flex items-center gap-4 bg-gradient-to-br from-blue-50/40 dark:from-blue-900/10 to-indigo-50/40 dark:to-indigo-900/10">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
            <Users size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stats.totalApplicants}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Total Applicants In Pipeline</div>
          </div>
        </div>

        <div className="panel p-5 flex items-center gap-4 bg-gradient-to-br from-amber-50/40 dark:from-amber-900/10 to-orange-50/40 dark:to-orange-900/10">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stats.avgMatchRate}%</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Avg Candidate Skill Fit</div>
          </div>
        </div>
      </div>

      {/* Main Jobs Directory Table / List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-semibold text-sm flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
            <FolderKanban size={15} />
            Your Open Positions ({jobs.length})
          </h3>
        </div>

        {jobs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {jobs.map((job) => (
              <article key={job.id} className="panel p-5 flex flex-col justify-between hover:shadow-md transition">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-bold text-base truncate" style={{ color: "var(--text-primary)" }}>{job.title}</h4>
                    <span className="chip uppercase text-[9px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">
                      {job.type}
                    </span>
                  </div>

                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {[job.location || "Remote", titleCase(job.workMode || "")].filter(Boolean).join(" • ")}
                  </p>

                  <div className="flex items-center gap-4 text-xs font-semibold mt-2.5">
                    <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <CheckCircle size={14} />
                      {job.applicationsCount || 0} Candidates
                    </span>
                    {job.createdAt && (
                      <span className="flex items-center gap-1 font-normal" style={{ color: "var(--text-muted)" }}>
                        <Clock size={14} />
                        Posted {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-3 mt-4 shrink-0" style={{ borderColor: "var(--border)" }}>
                  <button
                    className="btn-primary py-1 px-3 text-xs flex items-center gap-1 font-semibold"
                    type="button"
                    onClick={() => onManageCandidates(job.id)}
                  >
                    <FolderKanban size={13} />
                    Manage Candidates
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BriefcaseBusiness}
            title="No job listings posted"
            text="You have not created any job listings. Click 'Post New Job' to find top developer talent."
          />
        )}
      </div>
    </div>
  );
}
