import { useState } from "react";
import { Users, Loader2 } from "lucide-react";
import { EmptyState } from "../ui";
import { Job, JobApplication } from "../../lib/api";

interface RecruiterAppsTabProps {
  jobs: Job[];
  selectedJobId: string;
  onSelectedJobIdChange: (jobId: string) => void;
  applications: JobApplication[] | undefined;
  isLoading: boolean;
  onUpdateStatus: (appId: string, status: string, notes?: string) => void;
  isUpdating: boolean;
}

export function RecruiterAppsTab({
  jobs,
  selectedJobId,
  onSelectedJobIdChange,
  applications,
  isLoading,
  onUpdateStatus,
  isUpdating,
}: RecruiterAppsTabProps) {
  const [appNotes, setAppNotes] = useState<Record<string, string>>({});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: "var(--border)" }}>
        <h3 className="font-semibold text-sm flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
          <Users size={15} />
          Review Candidates
        </h3>

        {jobs.length > 0 && (
          <select
            value={selectedJobId}
            onChange={(e) => onSelectedJobIdChange(e.target.value)}
            className="bg-gray-55 dark:bg-gray-955 border rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {!selectedJobId ? (
        <EmptyState
          icon={Users}
          title="No active jobs selected"
          text="Select an active job posting above to review incoming applications."
        />
      ) : isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      ) : !applications || applications.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No candidates applied yet"
          text="Applications submitted by engineers for this job position will appear here."
        />
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const currentNotes = appNotes[app.id] ?? app.recruiterNotes ?? "";
            return (
              <div key={app.id} className="panel p-5 space-y-4 hover:shadow-sm transition">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-400">
                      {app.applicant?.profile?.avatarUrl ? (
                        <img src={app.applicant.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        app.applicant?.profile?.fullName?.slice(0, 2) || "C"
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                        {app.applicant?.profile?.fullName || "Candidate"}
                      </h4>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        @{app.applicant?.username} • {app.applicant?.profile?.location || "Remote"}
                      </p>
                      <p className="text-xs italic mt-1" style={{ color: "var(--text-secondary)" }}>
                        {app.applicant?.profile?.headline || "Software Engineer"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded border border-blue-150">
                      Score: {app.applicant?.engineeringScore ?? 80}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-150">
                      Reputation: {app.applicant?.reputationScore ?? 100}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      app.status === "SHORTLISTED" ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200" :
                      app.status === "INTERVIEW" ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200" :
                      app.status === "REJECTED" ? "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200" :
                      "bg-slate-50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 border-slate-200"
                    }`}>{app.status}</span>
                  </div>
                </div>

                {app.coverLetter && (
                  <div className="text-xs p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-955/20" style={{ borderColor: "var(--border)" }}>
                    <p className="font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Cover Letter / Note:</p>
                    <p className="whitespace-pre-line" style={{ color: "var(--text-muted)" }}>{app.coverLetter}</p>
                  </div>
                )}

                {/* Actions & Notes Row */}
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                  <div className="flex-1 w-full flex gap-2">
                    <input
                      type="text"
                      placeholder="Add notes (visible only to you)..."
                      value={currentNotes}
                      onChange={(e) => setAppNotes({ ...appNotes, [app.id]: e.target.value })}
                      className="flex-1 bg-gray-50 dark:bg-gray-950 border border-gray-250 dark:border-gray-855 rounded-xl px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      style={{ color: "var(--text-primary)" }}
                    />
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => onUpdateStatus(app.id, "SHORTLISTED", currentNotes)}
                      disabled={isUpdating}
                      className="btn-primary py-1 px-3 text-[10px] font-semibold flex items-center gap-1 disabled:opacity-50"
                    >
                      Shortlist
                    </button>
                    <button
                      onClick={() => onUpdateStatus(app.id, "INTERVIEW", currentNotes)}
                      disabled={isUpdating}
                      className="py-1 px-3 text-[10px] border rounded-xl font-semibold flex items-center gap-1 hover:bg-slate-55 disabled:opacity-50"
                      style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                    >
                      Interview
                    </button>
                    <button
                      onClick={() => onUpdateStatus(app.id, "REJECTED", currentNotes)}
                      disabled={isUpdating}
                      className="py-1 px-3 text-[10px] border border-rose-200 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl font-semibold flex items-center gap-1 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
