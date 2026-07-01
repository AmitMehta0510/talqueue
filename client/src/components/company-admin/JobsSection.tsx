import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Loader2, ChevronRight } from "lucide-react";
import { PageLoader } from "../ui";

const KanbanPipeline = lazy(() => import("../recruiter/KanbanPipeline").then(m => ({ default: m.KanbanPipeline })));

interface JobItem {
  id: string;
  title?: string;
  status?: string | null;
  location?: string | null;
  type?: string;
  createdAt?: string | Date | number;
}

interface JobsSectionProps {
  jobs: JobItem[];
  isLoading: boolean;
  managedJobId: string | null;
  onManageJobId: (jobId: string | null) => void;
  jobPage: number;
  setJobPage: (page: number) => void;
  totalPages: number;
}

export function JobsSection({
  jobs,
  isLoading,
  managedJobId,
  onManageJobId,
  jobPage,
  setJobPage,
  totalPages,
}: JobsSectionProps) {
  if (managedJobId) {
    return (
      <div className="space-y-4 rounded-xl border p-5 animate-fade-in" style={{ borderColor: "var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)" }}>
        <Suspense fallback={<PageLoader />}>
          <KanbanPipeline jobId={managedJobId} onBack={() => onManageJobId(null)} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Jobs Postings</h2>
        <Link
          to="/jobs"
          className="btn-primary text-xs px-3 py-1.5"
        >
          Open Jobs Portal
        </Link>
      </div>

      <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>All Company Job Postings</h3>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-indigo-500" size={20} />
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed rounded-xl p-8 text-center" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg mb-3" style={{ background: "var(--bg-surface-3)", color: "var(--text-muted)" }}>
              <Briefcase size={18} />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>No Job Postings Found</h4>
            <p className="text-[11px] max-w-xs mt-1.5 mb-4" style={{ color: "var(--text-muted)" }}>
              Once recruiters from your company post open roles, they will appear here along with live candidate counts.
            </p>
            <Link
              to="/jobs"
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Go to Jobs Hub
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                      {job.title}
                      <span className="chip text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20 text-[8px] font-bold">
                        {job.status || "OPEN"}
                      </span>
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                      {job.location || "Remote"} · {job.type} · Posted {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => onManageJobId(job.id)}
                    className="text-xs font-semibold hover:underline flex items-center gap-0.5"
                    style={{ color: "var(--brand)" }}
                  >
                    Manage <ChevronRight size={12} />
                  </button>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4 mt-4 text-xs" style={{ borderColor: "var(--border)" }}>
                <div style={{ color: "var(--text-muted)" }}>
                  Showing page <span className="font-bold" style={{ color: "var(--text-secondary)" }}>{jobPage}</span> of{" "}
                  <span className="font-bold" style={{ color: "var(--text-secondary)" }}>{totalPages}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setJobPage(Math.max(1, jobPage - 1))}
                    disabled={jobPage === 1}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setJobPage(Math.min(totalPages, jobPage + 1))}
                    disabled={jobPage === totalPages}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
