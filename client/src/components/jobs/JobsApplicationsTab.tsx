import { Job, ExternalJobApplication } from "../../lib/api";
import { InlineLoader } from "../ui";
import { ApplicationKanbanBoard } from "./ApplicationKanbanBoard";

export interface JobsApplicationsTabProps {
  isLoading: boolean;
  platformApps: Array<{
    id: string;
    jobId: string;
    status: string;
    createdAt: string;
    job?: Job;
  }>;
  externalApps: ExternalJobApplication[];
}

export function JobsApplicationsTab({
  isLoading,
  platformApps,
  externalApps,
}: JobsApplicationsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>My Application Tracker</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Platform applications (recruiter-tracked) + external applications (self-tracked)
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="flex items-center gap-1 rounded-full border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 font-semibold text-blue-700 dark:text-blue-300">
            Platform
          </span>
          <span className="flex items-center gap-1 rounded-full border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-300">
            External
          </span>
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-16"><InlineLoader label="Loading applications…" /></div>
      ) : (
        <ApplicationKanbanBoard
          platformApps={platformApps}
          externalApps={externalApps}
        />
      )}
    </div>
  );
}
