import { Link } from "react-router-dom";
import { Briefcase, ArrowRight, Star, Plus } from "lucide-react";
import { useAuth } from "../../core/contexts/AuthContext";
import { isRecruiter } from "../../core/utils/roles";
import {
  useRecruiterJobsQuery,
  useSuggestedJobsQuery,
} from "../../hooks/usePlatformQueries";
import { WidgetContainer } from "../ui/WidgetContainer";
import { SkeletonBlock } from "../ui";
import { Job } from "../../lib/api";

export function ActiveJobsWidget() {
  const { user } = useAuth();
  const recruiter = isRecruiter(user);

  const recruiterJobs = useRecruiterJobsQuery();
  const suggestedJobs = useSuggestedJobsQuery();

  const isLoading = recruiter ? recruiterJobs.isLoading : suggestedJobs.isLoading;
  const isError = recruiter ? recruiterJobs.isError : suggestedJobs.isError;

  const headerAction = recruiter ? (
    <Link
      to="/career/recruiter"
      className="inline-flex items-center gap-1 text-[10px] text-brand hover:underline font-bold"
    >
      <Plus size={10} />
      Post Job
    </Link>
  ) : (
    <Link
      to="/career/jobs"
      className="inline-flex items-center gap-0.5 text-[10px] text-brand hover:underline font-bold"
    >
      Browse Openings
      <ArrowRight size={10} />
    </Link>
  );

  if (isLoading) {
    return (
      <WidgetContainer title={recruiter ? "Active Job Postings" : "Suggested Jobs"} action={headerAction}>
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex gap-3">
              <SkeletonBlock className="h-10 w-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-3 w-3/4" />
                <SkeletonBlock className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </WidgetContainer>
    );
  }

  if (isError) {
    return (
      <WidgetContainer title={recruiter ? "Active Job Postings" : "Suggested Jobs"} action={headerAction}>
        <div className="text-center py-4 text-xs text-danger">
          Failed to load job listings
        </div>
      </WidgetContainer>
    );
  }

  if (recruiter) {
    const jobs = recruiterJobs.data || [];

    return (
      <WidgetContainer title="Active Job Postings" action={headerAction}>
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted flex flex-col items-center justify-center gap-2 border border-dashed border-[color:var(--border)] rounded-2xl p-4">
            <Briefcase size={28} className="text-muted" />
            <div className="space-y-0.5">
              <p className="font-bold text-primary">No job postings created</p>
              <p className="text-[10px]">Create job listings to collect applicant portfolios</p>
            </div>
            <Link
              to="/career/recruiter"
              className="btn-primary mt-2 text-[10px] py-1.5 px-3 rounded-lg"
            >
              Post First Job
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5">
            {jobs.slice(0, 4).map((job: Job) => (
              <Link
                key={job.id}
                to={`/career/recruiter?activeJobId=${job.id}`}
                className="flex items-start gap-3 p-2 rounded-xl border border-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--bg-surface-2)] transition-all duration-200"
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-brand-light text-brand shrink-0 border border-brand/5">
                  <Briefcase size={16} />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-primary truncate hover:text-brand transition-colors duration-200">
                    {job.title}
                  </h4>
                  <p className="text-[10px] text-secondary truncate mt-0.5 font-medium">
                    {job.location || "Remote"} • {job.type || "Full-Time"}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[9px] text-muted">
                    <span className="px-1.5 py-0.5 rounded bg-surface-3 text-[9px] font-extrabold border border-[color:var(--border)]">
                      {job.applicationsCount || 0} Candidates
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-extrabold text-[8px] uppercase">
                      OPEN
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </WidgetContainer>
    );
  }

  // Student view — Suggested Jobs list
  const suggested = suggestedJobs.data || [];

  return (
    <WidgetContainer title="Suggested Jobs" action={headerAction}>
      {suggested.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted flex flex-col items-center justify-center gap-2">
          <Briefcase size={24} className="text-muted" />
          <span>No suggested jobs available at this time</span>
        </div>
      ) : (
        <div className="space-y-3.5">
          {suggested.slice(0, 4).map((job: Job) => (
            <Link
              key={job.id}
              to={`/career/jobs?selectedJobId=${job.id}`}
              className="flex items-start gap-3 p-2 rounded-xl border border-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--bg-surface-2)] transition-all duration-200"
            >
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-brand-light text-brand shrink-0 border border-brand/5">
                <Briefcase size={16} />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-primary truncate hover:text-brand transition-colors duration-200">
                  {job.title}
                </h4>
                <p className="text-[10px] text-secondary truncate mt-0.5 font-medium">
                  {job.company?.name || "Corporate Partner"}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[9px] text-muted">
                  {job.location && (
                    <span className="px-1.5 py-0.5 rounded bg-surface-3 text-[9px] font-extrabold border border-[color:var(--border)]">
                      {job.location}
                    </span>
                  )}
                  {(job.salaryMin || job.salaryMax) && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-extrabold">
                      LPA: {job.salaryMin || ""}-{job.salaryMax || ""}
                    </span>
                  )}
                  {job.company?.verified && (
                    <span className="flex items-center gap-0.5 text-amber-500 font-extrabold text-[8px] uppercase">
                      <Star size={8} /> Verified
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </WidgetContainer>
  );
}
export default ActiveJobsWidget;
