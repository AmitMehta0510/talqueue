import { useState, useMemo } from "react";
import {
  BriefcaseBusiness,
  Users,
  Award,
  Sparkles,
  ChevronRight,
  TrendingUp,
  FolderKanban,
  CheckCircle,
  Clock,
  Plus,
} from "lucide-react";
import {
  useRecruiterDashboardQuery,
  useRecruiterInsightsQuery,
  useRecruiterJobsQuery,
} from "../hooks/usePlatformQueries";
import { useAuth } from "../contexts/AuthContext";
import { EmptyState, InlineLoader, ErrorState } from "../components/ui";
import { KanbanPipeline } from "../components/recruiter/KanbanPipeline";
import { JobPostModal } from "../components/forms/JobPostModal";
import { formatCount, titleCase } from "../lib/format";
import { Job } from "../lib/api";

export function RecruiterPage() {
  const { user } = useAuth();
  const [managedJobId, setManagedJobId] = useState<string | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  const dashboardQuery = useRecruiterDashboardQuery();
  const insightsQuery = useRecruiterInsightsQuery();
  const jobsQuery = useRecruiterJobsQuery();

  const activeJobs = jobsQuery.data || [];
  const dashboard = dashboardQuery.data;
  const insights = insightsQuery.data;

  // Calculate stats
  const stats = useMemo(() => {
    const totalJobs = activeJobs.length;
    const totalApplicants = activeJobs.reduce((acc, job) => acc + (job.applicationsCount || 0), 0);
    const avgMatchRate = 78; // complement match rate estimate or defaults
    return { totalJobs, totalApplicants, avgMatchRate };
  }, [activeJobs]);

  const loading = dashboardQuery.isLoading || insightsQuery.isLoading || jobsQuery.isLoading;
  const isError = dashboardQuery.isError || insightsQuery.isError || jobsQuery.isError;

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
        <KanbanPipeline jobId={managedJobId} onBack={() => setManagedJobId(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Recruiter Console</h2>
          <p className="text-xs text-slate-500 mt-0.5">
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

      {/* Recruiter Stats Overview Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-5 flex items-center gap-4 bg-gradient-to-br from-emerald-50/40 to-teal-50/40">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
            <BriefcaseBusiness size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-950">{stats.totalJobs}</div>
            <div className="text-xs text-slate-500">Active Job Postings</div>
          </div>
        </div>

        <div className="panel p-5 flex items-center gap-4 bg-gradient-to-br from-blue-50/40 to-indigo-50/40">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
            <Users size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-950">{stats.totalApplicants}</div>
            <div className="text-xs text-slate-500">Total Applicants In Pipeline</div>
          </div>
        </div>

        <div className="panel p-5 flex items-center gap-4 bg-gradient-to-br from-amber-50/40 to-orange-50/40">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-950">{stats.avgMatchRate}%</div>
            <div className="text-xs text-slate-500">Avg Candidate Skill Fit</div>
          </div>
        </div>
      </div>

      {/* Main Jobs Directory Table / List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-1.5">
            <FolderKanban size={15} />
            Your Open Positions ({activeJobs.length})
          </h3>
        </div>

        {activeJobs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {activeJobs.map((job: Job) => (
              <article key={job.id} className="panel p-5 flex flex-col justify-between hover:shadow-md transition">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-bold text-base text-slate-950 truncate">{job.title}</h4>
                    <span className="chip uppercase text-[9px] font-bold bg-emerald-50 text-emerald-800">
                      {job.type}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    {[job.location || "Remote", titleCase(job.workMode || "")].filter(Boolean).join(" &bull; ")}
                  </p>

                  <div className="flex items-center gap-4 text-xs font-semibold mt-2.5">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle size={14} />
                      {job.applicationsCount || 0} Candidates
                    </span>
                    {job.createdAt && (
                      <span className="text-slate-400 flex items-center gap-1 font-normal">
                        <Clock size={14} />
                        Posted {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-4 shrink-0">
                  <button
                    className="btn-primary py-1 px-3 text-xs flex items-center gap-1 font-semibold"
                    type="button"
                    onClick={() => setManagedJobId(job.id)}
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

      {showPostModal && (
        <JobPostModal
          onClose={() => setShowPostModal(false)}
          onSuccess={() => {
            jobsQuery.refetch();
            dashboardQuery.refetch();
          }}
        />
      )}
    </div>
  );
}
