import { Link } from "react-router-dom";
import { Inbox, Calendar, ArrowRight, UserCheck, ExternalLink, Plus } from "lucide-react";
import { useAuth } from "../../core/contexts/AuthContext";
import { isRecruiter } from "../../core/utils/roles";
import {
  useRecruiterDashboardQuery,
  useMyJobApplicationsQuery,
  useMyExternalApplicationsQuery,
} from "../../hooks/usePlatformQueries";
import { WidgetContainer } from "../ui/WidgetContainer";
import { SkeletonBlock } from "../ui";
import { formatDate } from "../../core/utils/format";
import { JobApplication, ExternalJobApplication, ExternalAppStatus } from "../../lib/api";

// Status color mapping for external applications
const EXTERNAL_STATUS_COLORS: Record<ExternalAppStatus, { bg: string; text: string }> = {
  APPLIED: { bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-600 dark:text-blue-400" },
  PHONE_SCREEN: { bg: "bg-indigo-50 dark:bg-indigo-950/20", text: "text-indigo-600 dark:text-indigo-400" },
  TECHNICAL_ROUND: { bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-600 dark:text-amber-400" },
  HR_ROUND: { bg: "bg-violet-50 dark:bg-violet-950/20", text: "text-violet-600 dark:text-violet-400" },
  OFFER_RECEIVED: { bg: "bg-emerald-50 dark:bg-emerald-950/20", text: "text-emerald-600 dark:text-emerald-400" },
  REJECTED: { bg: "bg-rose-50 dark:bg-rose-950/20", text: "text-rose-600 dark:text-rose-400" },
  WITHDRAWN: { bg: "bg-slate-50 dark:bg-slate-950/20", text: "text-slate-500 dark:text-slate-400" },
};

const PLATFORM_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  APPLIED: { bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-600 dark:text-blue-400" },
  VIEWED: { bg: "bg-slate-50 dark:bg-slate-950/20", text: "text-slate-500 dark:text-slate-400" },
  SHORTLISTED: { bg: "bg-indigo-50 dark:bg-indigo-950/20", text: "text-indigo-600 dark:text-indigo-400" },
  INTERVIEW: { bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-600 dark:text-amber-400" },
  REJECTED: { bg: "bg-rose-50 dark:bg-rose-950/20", text: "text-rose-600 dark:text-rose-400" },
  HIRED: { bg: "bg-emerald-50 dark:bg-emerald-950/20", text: "text-emerald-600 dark:text-emerald-400" },
};

export function RecentApplicationsWidget() {
  const { user } = useAuth();
  const recruiter = isRecruiter(user);

  const recruiterDashboard = useRecruiterDashboardQuery();
  const studentPlatformApps = useMyJobApplicationsQuery();
  const studentExternalApps = useMyExternalApplicationsQuery();

  const isLoading = recruiter
    ? recruiterDashboard.isLoading
    : studentPlatformApps.isLoading || studentExternalApps.isLoading;
  const isError = recruiter
    ? recruiterDashboard.isError
    : studentPlatformApps.isError || studentExternalApps.isError;

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
      to="/career/jobs?tab=applications"
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

  // ── RECRUITER VIEW ──────────────────────────────────────────────────────────
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

  // ── STUDENT VIEW ────────────────────────────────────────────────────────────
  const platformApps = studentPlatformApps.data || [];
  const externalApps = studentExternalApps.data || [];
  const hasPlatformApps = platformApps.length > 0;
  const hasExternalApps = externalApps.length > 0;
  const hasAnyApps = hasPlatformApps || hasExternalApps;

  return (
    <WidgetContainer title="Your Applications" action={headerAction}>
      {!hasAnyApps ? (
        /* ── Empty State ── */
        <div className="text-center py-8 text-xs text-muted flex flex-col items-center justify-center gap-2 border border-dashed border-[color:var(--border)] rounded-2xl p-4">
          <Inbox size={28} className="text-muted" />
          <div className="space-y-0.5">
            <p className="font-bold text-primary">No applications tracked yet</p>
            <p className="text-[10px]">Apply to jobs or track your applications via the Kanban board</p>
          </div>
          <Link
            to="/career/jobs"
            className="btn-primary mt-2 text-[10px] py-1.5 px-3 rounded-lg"
          >
            Explore Job Openings
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Platform Job Applications (Recruiter-posted, off-campus) ── */}
          {hasPlatformApps && (
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted">
                  Platform Jobs
                </span>
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-brand-light text-brand text-[8px] font-black">
                  {platformApps.length}
                </span>
              </div>
              <div className="space-y-2">
                {platformApps.slice(0, 3).map((app: JobApplication) => {
                  const statusColor = PLATFORM_STATUS_COLORS[app.status ?? ""] || {
                    bg: "bg-slate-50 dark:bg-slate-950/20",
                    text: "text-slate-500",
                  };
                  return (
                    <Link
                      key={app.id}
                      to="/career/jobs?tab=applications"
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
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${statusColor.bg} ${statusColor.text}`}>
                          {app.status}
                        </span>
                        <p className="text-[9px] text-muted mt-1 flex items-center gap-0.5 justify-end">
                          <Calendar size={8} />
                          {formatDate(app.createdAt)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Separator ── */}
          {hasPlatformApps && hasExternalApps && (
            <div className="border-t border-[color:var(--border)]" />
          )}

          {/* ── External / Self-Tracked Applications ── */}
          {hasExternalApps && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted">
                    Self-Tracked
                  </span>
                  <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[8px] font-black">
                    {externalApps.length}
                  </span>
                </div>
                <Link
                  to="/career/jobs?tab=applications"
                  className="inline-flex items-center gap-0.5 text-[9px] text-muted hover:text-brand transition-colors"
                >
                  <Plus size={9} />
                  Add
                </Link>
              </div>
              <div className="space-y-2">
                {externalApps.slice(0, 3).map((app: ExternalJobApplication) => {
                  const statusColor = EXTERNAL_STATUS_COLORS[app.status] || {
                    bg: "bg-slate-50 dark:bg-slate-950/20",
                    text: "text-slate-500",
                  };
                  return (
                    <Link
                      key={app.id}
                      to="/career/jobs?tab=applications"
                      className="flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--bg-surface-2)] transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {app.companyLogoUrl ? (
                          <img
                            src={app.companyLogoUrl}
                            alt={app.companyName}
                            className="h-9 w-9 rounded-xl object-cover border border-[color:var(--border)] bg-white shrink-0"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 shrink-0 border border-amber-200 dark:border-amber-800/30">
                            <ExternalLink size={14} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-primary truncate hover:text-brand transition-colors duration-200">
                            {app.jobTitle}
                          </h4>
                          <p className="text-[10px] text-secondary truncate mt-0.5 font-medium">
                            {app.companyName}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${statusColor.bg} ${statusColor.text}`}>
                          {app.status.replace(/_/g, " ")}
                        </span>
                        <p className="text-[9px] text-muted mt-1 flex items-center gap-0.5 justify-end">
                          <Calendar size={8} />
                          {formatDate(app.appliedAt)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </WidgetContainer>
  );
}
export default RecentApplicationsWidget;


