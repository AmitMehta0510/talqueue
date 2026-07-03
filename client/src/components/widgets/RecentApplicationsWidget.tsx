import { Link } from "react-router-dom";
import { Inbox, Calendar, ArrowRight, UserCheck } from "lucide-react";
import { useAuth } from "../../core/contexts/AuthContext";
import { isRecruiter } from "../../core/utils/roles";
import {
  useRecruiterDashboardQuery,
  useMyJobApplicationsQuery,
} from "../../hooks/usePlatformQueries";
import { WidgetContainer } from "../ui/WidgetContainer";
import { SkeletonBlock } from "../ui";
import { formatDate } from "../../core/utils/format";
import { JobApplication } from "../../lib/api";

export function RecentApplicationsWidget() {
  const { user } = useAuth();
  const recruiter = isRecruiter(user);

  const recruiterDashboard = useRecruiterDashboardQuery();
  const studentApps = useMyJobApplicationsQuery();

  const isLoading = recruiter ? recruiterDashboard.isLoading : studentApps.isLoading;
  const isError = recruiter ? recruiterDashboard.isError : studentApps.isError;

  const headerAction = recruiter ? (
    <Link
      to="/career/recruiter"
      className="inline-flex items-center gap-0.5 text-[10px] text-brand hover:underline font-bold"
    >
      Manage Pipeline
      <ArrowRight size={10} />
    </Link>
  ) : (
    <Link
      to="/campus/placements"
      className="inline-flex items-center gap-0.5 text-[10px] text-brand hover:underline font-bold"
    >
      Track Funnel
      <ArrowRight size={10} />
    </Link>
  );

  if (isLoading) {
    return (
      <WidgetContainer title={recruiter ? "Recent Candidates" : "Your Applications"} action={headerAction}>
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
      <WidgetContainer title={recruiter ? "Recent Candidates" : "Your Applications"} action={headerAction}>
        <div className="text-center py-4 text-xs text-danger">
          Failed to load applications data
        </div>
      </WidgetContainer>
    );
  }

  if (recruiter) {
    const dashboardData = recruiterDashboard.data;
    const applications = dashboardData?.applications || [];

    return (
      <WidgetContainer title="Recent Candidates" action={headerAction}>
        {applications.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted flex flex-col items-center justify-center gap-2">
            <Inbox size={24} className="text-muted" />
            <span>No incoming applications yet</span>
          </div>
        ) : (
          <div className="space-y-3.5">
            {applications.slice(0, 4).map((app: JobApplication) => (
              <Link
                key={app.id}
                to={`/career/recruiter?activeJobId=${app.jobId}&activeAppId=${app.id}`}
                className="flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--bg-surface-2)] transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-brand-light text-brand flex items-center justify-center font-bold text-xs shrink-0">
                    {app.applicant?.profile?.fullName?.charAt(0) || app.applicant?.username?.charAt(0) || "C"}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-primary truncate">
                      {app.applicant?.profile?.fullName || app.applicant?.username}
                    </h4>
                    <p className="text-[10px] text-secondary truncate mt-0.5 font-medium">
                      Applied for {app.job?.title || "Job Role"}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-brand-light text-brand">
                    {app.status}
                  </span>
                  <p className="text-[9px] text-muted mt-1 flex items-center gap-0.5 justify-end">
                    <Calendar size={8} />
                    {formatDate(app.createdAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </WidgetContainer>
    );
  }

  // Student application view
  const apps = studentApps.data || [];

  return (
    <WidgetContainer title="Your Applications" action={headerAction}>
      {apps.length === 0 ? (
        <div className="text-center py-8 text-xs text-muted flex flex-col items-center justify-center gap-2 border border-dashed border-[color:var(--border)] rounded-2xl p-4">
          <Inbox size={28} className="text-muted" />
          <div className="space-y-0.5">
            <p className="font-bold text-primary">No applications tracked yet</p>
            <p className="text-[10px]">Submit job applications to view hiring funnel logs</p>
          </div>
          <Link
            to="/career/jobs"
            className="btn-primary mt-2 text-[10px] py-1.5 px-3 rounded-lg"
          >
            Explore Job Openings
          </Link>
        </div>
      ) : (
        <div className="space-y-3.5">
          {apps.slice(0, 4).map((app: JobApplication) => (
            <Link
              key={app.id}
              to="/campus/placements"
              className="flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--bg-surface-2)] transition-all duration-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-surface-3 flex items-center justify-center text-secondary shrink-0 border border-[color:var(--border)]">
                  <UserCheck size={16} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-primary truncate hover:text-brand transition-colors duration-200">
                    {app.job?.title || "Job Position"}
                  </h4>
                  <p className="text-[10px] text-secondary truncate mt-0.5 font-medium">
                    {app.job?.company?.name || "Corporate Partner"}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                  {app.status}
                </span>
                <p className="text-[9px] text-muted mt-1 flex items-center gap-0.5 justify-end">
                  <Calendar size={8} />
                  {formatDate(app.createdAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </WidgetContainer>
  );
}
export default RecentApplicationsWidget;
