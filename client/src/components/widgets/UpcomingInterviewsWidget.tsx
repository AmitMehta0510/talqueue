import { Link } from "react-router-dom";
import { Calendar, MonitorPlay, User, ArrowRight } from "lucide-react";
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

export function UpcomingInterviewsWidget() {
  const { user } = useAuth();
  const recruiter = isRecruiter(user);

  const recruiterDashboard = useRecruiterDashboardQuery();
  const studentApps = useMyJobApplicationsQuery();

  const isLoading = recruiter ? recruiterDashboard.isLoading : studentApps.isLoading;
  const isError = recruiter ? recruiterDashboard.isError : studentApps.isError;

  const headerAction = (
    <Link
      to="/career/interviews"
      className="inline-flex items-center gap-0.5 text-[10px] text-brand hover:underline font-bold"
    >
      Prep Hub
      <ArrowRight size={10} />
    </Link>
  );

  if (isLoading) {
    return (
      <WidgetContainer title="Upcoming Interviews" action={headerAction}>
        <div className="space-y-4">
          {[1, 2].map((n) => (
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
      <WidgetContainer title="Upcoming Interviews" action={headerAction}>
        <div className="text-center py-4 text-xs text-danger">
          Failed to load interview schedule
        </div>
      </WidgetContainer>
    );
  }

  // Extract applications in interview stage
  let interviews: JobApplication[] = [];
  if (recruiter) {
    const apps = recruiterDashboard.data?.applications || [];
    interviews = apps.filter((app: JobApplication) => app.status?.startsWith("INTERVIEW"));
  } else {
    const apps = studentApps.data || [];
    interviews = apps.filter((app: JobApplication) => app.status?.startsWith("INTERVIEW"));
  }

  return (
    <WidgetContainer title="Upcoming Interviews" action={headerAction}>
      {interviews.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted flex flex-col items-center justify-center gap-2">
          <Calendar size={24} className="text-muted" />
          <span>No interviews scheduled this week</span>
        </div>
      ) : (
        <div className="space-y-3.5">
          {interviews.slice(0, 3).map((interview: JobApplication) => {
            const displayTitle = recruiter
              ? interview.applicant?.profile?.fullName || interview.applicant?.username
              : interview.job?.title;
            const subtitle = recruiter
              ? `Job: ${interview.job?.title || "Role"}`
              : interview.job?.company?.name || "Corporate Partner";
            const roundText = interview.status?.replace("INTERVIEW_", "Round ") || "Interview";

            return (
              <div
                key={interview.id}
                className="flex items-start gap-3 p-2 rounded-xl border border-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--bg-surface-2)] transition-all duration-200"
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 shrink-0 border border-indigo-500/10">
                  {recruiter ? <User size={16} /> : <MonitorPlay size={16} />}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-primary truncate">
                    {displayTitle}
                  </h4>
                  <p className="text-[10px] text-secondary truncate mt-0.5 font-medium">
                    {subtitle}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[9px] text-muted">
                    <span className="px-1.5 py-0.5 rounded bg-brand-light text-brand font-black uppercase text-[8px]">
                      {roundText}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Calendar size={9} />
                      {formatDate(interview.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetContainer>
  );
}
export default UpcomingInterviewsWidget;
