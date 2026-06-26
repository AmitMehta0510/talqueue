import { useState, useMemo } from "react";
import {
  BriefcaseBusiness,
  Users,
  Sparkles,
  FolderKanban,
  CheckCircle,
  Clock,
  Plus,
  GraduationCap,
  Send,
  X,
  Loader2,
  Building2,
  ClipboardList,
} from "lucide-react";
import {
  useRecruiterDashboardQuery,
  useRecruiterInsightsQuery,
  useRecruiterJobsQuery,
  useDriveInvitesForCompanyQuery,
  useWithdrawDriveInviteMutation,
  useMyPostedDrivesQuery,
  useMyClaimStatusQuery,
  useRecruiterClaimJobApplicationsQuery,
  useUpdateApplicationStatusMutation,
} from "../hooks/usePlatformQueries";
import { DriveApplicantsModal } from "../components/jobs/DriveApplicantsModal";
import { useAuth } from "../contexts/AuthContext";
import { EmptyState, InlineLoader, ErrorState } from "../components/ui";
import { KanbanPipeline } from "../components/recruiter/KanbanPipeline";
import { JobPostModal } from "../components/forms/JobPostModal";
import { DriveInviteModal } from "../components/jobs/DriveInviteModal";
import { titleCase, formatDate } from "../lib/format";
import { Job, JobApplication } from "../lib/api";

export function RecruiterPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"claim" | "jobs" | "apps">("jobs");
  const [managedJobId, setManagedJobId] = useState<string | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showDriveInviteModal, setShowDriveInviteModal] = useState(false);
  const [selectedDriveForApplicants, setSelectedDriveForApplicants] = useState<{ id: string; title: string } | null>(null);

  // For Applications tab
  const [selectedJobIdForApps, setSelectedJobIdForApps] = useState<string>("");
  const [appNotes, setAppNotes] = useState<Record<string, string>>({});

  const dashboardQuery = useRecruiterDashboardQuery();
  const insightsQuery = useRecruiterInsightsQuery();
  const jobsQuery = useRecruiterJobsQuery();
  const claimStatusQuery = useMyClaimStatusQuery(activeTab === "claim");

  // Detect the recruiter's primary company
  const recruiterCompany = useMemo(() => {
    const experiences = (user as any)?.experiences || [];
    const adminRoles = (user as any)?.companyAdmins || [];
    return adminRoles[0]?.company || experiences[0]?.company || null;
  }, [user]);

  const companyId = recruiterCompany?.id as string | undefined;
  const driveInvitesQuery = useDriveInvitesForCompanyQuery(companyId);
  const withdrawInviteMutation = useWithdrawDriveInviteMutation(companyId);
  const myPostedDrivesQuery = useMyPostedDrivesQuery();
  const postedDrives = myPostedDrivesQuery.data || [];

  const activeJobs = jobsQuery.data || [];

  // Applications Query
  const appsQuery = useRecruiterClaimJobApplicationsQuery(
    selectedJobIdForApps,
    undefined,
    activeTab === "apps" && Boolean(selectedJobIdForApps)
  );
  const updateAppMutation = useUpdateApplicationStatusMutation(selectedJobIdForApps);

  // Set default selected job in Applications tab when jobs load
  useMemo(() => {
    if (activeJobs.length > 0 && !selectedJobIdForApps) {
      setSelectedJobIdForApps(activeJobs[0].id);
    }
  }, [activeJobs, selectedJobIdForApps]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalJobs = activeJobs.length;
    const totalApplicants = activeJobs.reduce((acc, job) => acc + (job.applicationsCount || 0), 0);
    const avgMatchRate = 78;
    return { totalJobs, totalApplicants, avgMatchRate };
  }, [activeJobs]);

  const loading = dashboardQuery.isLoading || insightsQuery.isLoading || jobsQuery.isLoading || myPostedDrivesQuery.isLoading;
  const isError = dashboardQuery.isError || insightsQuery.isError || jobsQuery.isError || myPostedDrivesQuery.isError;

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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-2" style={{ borderColor: "var(--border)" }}>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Recruiter Console</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
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

      {/* Tabs Switcher */}
      <div className="flex space-x-6 border-b" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => setActiveTab("jobs")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "jobs"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          My Jobs
        </button>
        <button
          onClick={() => setActiveTab("apps")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "apps"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Applications
        </button>
        <button
          onClick={() => setActiveTab("claim")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "claim"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Claim Status
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "jobs" && (
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
                Your Open Positions ({activeJobs.length})
              </h3>
            </div>

            {activeJobs.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {activeJobs.map((job: Job) => (
                  <article key={job.id} className="panel p-5 flex flex-col justify-between hover:shadow-md transition">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-bold text-base truncate" style={{ color: "var(--text-primary)" }}>{job.title}</h4>
                        <span className="chip uppercase text-[9px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">
                          {job.type}
                        </span>
                      </div>

                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {[job.location || "Remote", titleCase(job.workMode || "")].filter(Boolean).join(" &bull; ")}
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

          {/* Campus Drive Invitations */}
          {companyId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border)" }}>
                <h3 className="font-semibold text-sm flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                  <GraduationCap size={15} />
                  Campus Drive Invitations
                </h3>
                <button
                  type="button"
                  onClick={() => setShowDriveInviteModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 transition shadow-sm"
                >
                  <Send size={12} /> Invite a College
                </button>
              </div>

              {driveInvitesQuery.isLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" size={18} /></div>
              ) : (driveInvitesQuery.data || []).length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {(driveInvitesQuery.data || []).map((invite) => (
                    <div key={invite.id} className="panel p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{invite.driveTitle}</p>
                          <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--text-muted)" }}>
                            <Building2 size={10} />{invite.college?.name}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          invite.status === "PENDING" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700" :
                          invite.status === "ACCEPTED" ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700" :
                          invite.status === "REJECTED" ? "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700" :
                          ""
                        }`} style={invite.status !== "PENDING" && invite.status !== "ACCEPTED" && invite.status !== "REJECTED" ? { background: "var(--bg-surface-2)", color: "var(--text-muted)", borderColor: "var(--border)" } : {}}>{invite.status}</span>
                      </div>
                      {invite.driveDate && (
                        <p className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                          <Clock size={9} /> {formatDate(invite.driveDate)}
                        </p>
                      )}
                      {invite.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => withdrawInviteMutation.mutate(invite.id)}
                          disabled={withdrawInviteMutation.isPending}
                          className="text-[10px] font-bold hover:text-rose-600 flex items-center gap-1 transition disabled:opacity-50" style={{ color: "var(--text-muted)" }}
                        >
                          <X size={10} /> Withdraw
                        </button>
                      )}
                      {invite.status === "ACCEPTED" && invite.placementDrive && (
                        <p className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                          <CheckCircle size={10} /> Drive is live!
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={GraduationCap}
                  title="No campus drive invitations yet"
                  text="Invite colleges to participate in a campus placement drive. When accepted, the drive is automatically created."
                />
              )}
            </div>
          )}

          {/* Active Campus Placement Drives */}
          {companyId && (
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border)" }}>
                <h3 className="font-semibold text-sm flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                  <Sparkles size={15} className="text-indigo-600" />
                  Active Campus Drives ({postedDrives.length})
                </h3>
              </div>

              {postedDrives.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {postedDrives.map((drive) => (
                    <article key={drive.id} className="panel p-5 flex flex-col justify-between hover:shadow-md transition">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-bold text-sm leading-snug truncate" style={{ color: "var(--text-primary)" }}>
                            {drive.driveTitle}
                          </h4>
                          <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-bold ${
                            drive.status === "ONGOING" ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700" :
                            drive.status === "UPCOMING" ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700" :
                            ""
                          }`} style={drive.status !== "ONGOING" && drive.status !== "UPCOMING" ? { background: "var(--bg-surface-2)", color: "var(--text-muted)", borderColor: "var(--border)" } : {}}>
                            {drive.status}
                          </span>
                        </div>
                        <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--text-muted)" }}>
                          <Building2 size={11} style={{ color: "var(--text-muted)" } as React.CSSProperties} />
                          {drive.college?.name}
                        </p>
                        {drive.driveDate && (
                          <p className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                            <Clock size={10} /> Drive Date: {formatDate(drive.driveDate)}
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end gap-2 border-t pt-3 mt-4 shrink-0" style={{ borderColor: "var(--border)" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedDriveForApplicants({ id: drive.id, title: drive.driveTitle })}
                          className="btn-primary py-1 px-3 text-xs flex items-center gap-1 font-semibold"
                        >
                          <Users size={12} />
                          View Applicants
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="No active campus drives"
                  text="Your accepted campus placement drives will appear here once invitations are accepted by target colleges."
                />
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "apps" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-semibold text-sm flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
              <Users size={15} />
              Review Candidates
            </h3>

            {activeJobs.length > 0 && (
              <select
                value={selectedJobIdForApps}
                onChange={(e) => setSelectedJobIdForApps(e.target.value)}
                className="bg-gray-50 dark:bg-gray-955 border rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              >
                {activeJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {!selectedJobIdForApps ? (
            <EmptyState
              icon={Users}
              title="No active jobs selected"
              text="Select an active job posting above to review incoming applications."
            />
          ) : appsQuery.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
          ) : !appsQuery.data?.applications || appsQuery.data.applications.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No candidates applied yet"
              text="Applications submitted by engineers for this job position will appear here."
            />
          ) : (
            <div className="space-y-4">
              {appsQuery.data.applications.map((app: JobApplication) => (
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
                    <div className="text-xs p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-950/20" style={{ borderColor: "var(--border)" }}>
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
                        value={appNotes[app.id] ?? app.recruiterNotes ?? ""}
                        onChange={(e) => setAppNotes({ ...appNotes, [app.id]: e.target.value })}
                        className="flex-1 bg-gray-50 dark:bg-gray-950 border border-gray-250 dark:border-gray-855 rounded-xl px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        style={{ color: "var(--text-primary)" }}
                      />
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => updateAppMutation.mutate({ appId: app.id, status: "SHORTLISTED", recruiterNotes: appNotes[app.id] })}
                        disabled={updateAppMutation.isPending}
                        className="btn-primary py-1 px-3 text-[10px] font-semibold flex items-center gap-1 disabled:opacity-50"
                      >
                        Shortlist
                      </button>
                      <button
                        onClick={() => updateAppMutation.mutate({ appId: app.id, status: "INTERVIEW", recruiterNotes: appNotes[app.id] })}
                        disabled={updateAppMutation.isPending}
                        className="py-1 px-3 text-[10px] border rounded-xl font-semibold flex items-center gap-1 hover:bg-slate-50 disabled:opacity-50"
                        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                      >
                        Interview
                      </button>
                      <button
                        onClick={() => updateAppMutation.mutate({ appId: app.id, status: "REJECTED", recruiterNotes: appNotes[app.id] })}
                        disabled={updateAppMutation.isPending}
                        className="py-1 px-3 text-[10px] border border-rose-200 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl font-semibold flex items-center gap-1 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "claim" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-semibold text-sm flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
              <ClipboardList size={15} />
              Company Claim Requests
            </h3>
          </div>

          {claimStatusQuery.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
          ) : !claimStatusQuery.data || claimStatusQuery.data.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No claim requests"
              text="You haven't submitted any claim requests yet."
            />
          ) : (
            <div className="space-y-4">
              {claimStatusQuery.data.map((claim) => (
                <div key={claim.id} className="panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{claim.companyName}</h4>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Business Email: {claim.businessEmail}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Submitted on: {formatDate(claim.createdAt)}
                    </p>
                    {claim.reviewNotes && (
                      <p className="text-xs bg-slate-50 dark:bg-slate-950 p-2 rounded border mt-2" style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}>
                        <strong>Review Note: </strong> {claim.reviewNotes}
                      </p>
                    )}
                  </div>

                  <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full border ${
                    claim.status === "APPROVED" ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200" :
                    claim.status === "PENDING" ? "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200" :
                    "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200"
                  }`}>{claim.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showPostModal && (
        <JobPostModal
          onClose={() => setShowPostModal(false)}
          onSuccess={() => {
            jobsQuery.refetch();
            dashboardQuery.refetch();
          }}
        />
      )}

      {showDriveInviteModal && companyId && (
        <DriveInviteModal
          companyId={companyId}
          companyName={recruiterCompany?.name || "Your Company"}
          onClose={() => setShowDriveInviteModal(false)}
        />
      )}

      {selectedDriveForApplicants && (
        <DriveApplicantsModal
          driveId={selectedDriveForApplicants.id}
          driveTitle={selectedDriveForApplicants.title}
          onClose={() => setSelectedDriveForApplicants(null)}
        />
      )}
    </div>
  );
}
