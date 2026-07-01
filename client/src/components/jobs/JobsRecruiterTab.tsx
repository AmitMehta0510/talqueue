import { BriefcaseBusiness, Settings, Eye } from "lucide-react";
import { Job } from "../../lib/api";
import { InlineLoader, ErrorState, EmptyState } from "../ui";
import { titleCase } from "../../core/utils/format";

export interface JobsRecruiterTabProps {
  isLoading: boolean;
  isError: boolean;
  recruiterJobs: Job[];
  onRetry: () => void;
  onViewPipeline: (jobId: string) => void;
  onViewDetails: (job: Job) => void;
}

export function JobsRecruiterTab({
  isLoading,
  isError,
  recruiterJobs,
  onRetry,
  onViewPipeline,
  onViewDetails,
}: JobsRecruiterTabProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <InlineLoader label="Loading your jobs…" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load your posted jobs"
        text="Please try again."
        onRetry={onRetry}
      />
    );
  }

  if (recruiterJobs.length === 0) {
    return (
      <EmptyState
        icon={BriefcaseBusiness}
        title="No jobs posted yet"
        text="Click 'Post a Job' to start finding talent."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {recruiterJobs.map((job) => (
        <article key={job.id} className="panel p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-glow)] text-[var(--brand)]">
              <BriefcaseBusiness size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                {job.title}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {[job.location, titleCase(job.workMode), titleCase(job.type)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">
                {job.applicationsCount || 0} applicants
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              className="btn-secondary py-1 px-3 text-xs"
              onClick={() => onViewPipeline(job.id)}
            >
              <Settings size={12} /> Pipeline
            </button>
            <button
              type="button"
              className="btn-primary py-1 px-3 text-xs"
              onClick={() => onViewDetails(job)}
            >
              <Eye size={12} /> Details
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
