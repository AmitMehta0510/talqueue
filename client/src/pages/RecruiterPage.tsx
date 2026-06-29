import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  ArrowRight,
  MapPin,
  Calendar,
  Trophy,
  Search,
  Lock,
} from "lucide-react";
import {
  useRecruiterDashboardQuery,
  useRecruiterInsightsQuery,
  useRecruiterJobsQuery,
  useDriveInvitesForCompanyQuery,
  useInboundDriveInvitesForCompanyQuery,
  useWithdrawDriveInviteMutation,
  useRespondToDriveInviteMutation,
  useMyPostedDrivesQuery,
  useMyClaimStatusQuery,
  useRecruiterClaimJobApplicationsQuery,
  useUpdateApplicationStatusMutation,
  useResdexSearchQuery,
} from "../hooks/usePlatformQueries";
import { DriveApplicantsModal } from "../components/jobs/DriveApplicantsModal";
import { useAuth } from "../core/contexts/AuthContext";
import { EmptyState, InlineLoader, ErrorState } from "../components/ui";
import { KanbanPipeline } from "../components/recruiter/KanbanPipeline";
import { JobPostModal } from "../components/forms/JobPostModal";
import { DriveInviteModal } from "../components/jobs/DriveInviteModal";
import { titleCase, formatDate } from "../core/utils/format";
import { Job, JobApplication } from "../lib/api";

export function RecruiterPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"claim" | "jobs" | "apps" | "campus" | "search">("jobs");
  const navigate = useNavigate();
  const [managedJobId, setManagedJobId] = useState<string | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showDriveInviteModal, setShowDriveInviteModal] = useState(false);
  const [selectedDriveForApplicants, setSelectedDriveForApplicants] = useState<{ id: string; title: string } | null>(null);

  // For Applications tab
  const [selectedJobIdForApps, setSelectedJobIdForApps] = useState<string>("");
  const [appNotes, setAppNotes] = useState<Record<string, string>>({});

  // Resdex search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSkills, setSearchSkills] = useState<string[]>([]);
  const [newSkillTag, setNewSkillTag] = useState("");
  const [searchMinCgpa, setSearchMinCgpa] = useState<number | undefined>(undefined);
  const [searchGradYear, setSearchGradYear] = useState<number | undefined>(undefined);
  const [searchCollegeName, setSearchCollegeName] = useState("");
  const [searchCompanyName, setSearchCompanyName] = useState("");

  const searchFilters = useMemo(() => ({
    query: searchQuery || undefined,
    skills: searchSkills.length > 0 ? searchSkills : undefined,
    minCgpa: searchMinCgpa,
    graduationYear: searchGradYear,
    collegeName: searchCollegeName || undefined,
    companyName: searchCompanyName || undefined,
  }), [searchQuery, searchSkills, searchMinCgpa, searchGradYear, searchCollegeName, searchCompanyName]);

  const resdexQuery = useResdexSearchQuery(searchFilters, activeTab === "search");

  const dashboardQuery = useRecruiterDashboardQuery();
  const insightsQuery = useRecruiterInsightsQuery();
  const jobsQuery = useRecruiterJobsQuery();
  const claimStatusQuery = useMyClaimStatusQuery(activeTab === "claim");

  // Detect the recruiter's primary company
  const recruiterCompany = useMemo(() => {
    const experiences = (user as any)?.experiences || [];
    const adminRoles = (user as any)?.companyAdminships || (user as any)?.companyAdmins || [];
    return adminRoles[0]?.company || experiences[0]?.company || null;
  }, [user]);

  const companyId = recruiterCompany?.id as string | undefined;
  const driveInvitesQuery = useDriveInvitesForCompanyQuery(companyId);
  const inboundInvitesQuery = useInboundDriveInvitesForCompanyQuery(companyId);
  const inboundInvites = inboundInvitesQuery.data || [];
  const withdrawInviteMutation = useWithdrawDriveInviteMutation(companyId);
  const respondToInviteMutation = useRespondToDriveInviteMutation(null);
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

  const totalStudentsEngaged = useMemo(() => {
    return postedDrives.reduce((sum: number, drive: any) => sum + (drive._count?.applications ?? drive.applicationsCount ?? 0), 0);
  }, [postedDrives]);

  const conversionRatio = useMemo(() => {
    return "12.5%";
  }, []);

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
        <button
          onClick={() => setActiveTab("campus")}
          className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "campus"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <GraduationCap size={14} />
          Campus Drives
          {postedDrives.length > 0 && (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-500 px-1 text-[9px] font-bold text-white">
              {postedDrives.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("search")}
          className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "search"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Search size={14} />
          Talent Search (Resdex)
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

      {/* ─── CAMPUS DRIVES TAB ──────────────────────────────────────────────── */}
      {activeTab === "campus" && (
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Campus Placement Drives</h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Manage college invitations, track drive progress, and review applicants.
              </p>
            </div>
          </div>

          {/* Premium Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Sent Invites */}
            <div className="panel p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>Sent Invites</p>
                <h3 className="text-xl font-black mt-1" style={{ color: "var(--text-primary)" }}>
                  {(driveInvitesQuery.data || []).length}
                </h3>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500">
                <Send size={18} />
              </div>
            </div>

            {/* Card 2: Active Drives */}
            <div className="panel p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>Active Drives</p>
                <h3 className="text-xl font-black mt-1" style={{ color: "var(--text-primary)" }}>
                  {postedDrives.length}
                </h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                <Trophy size={18} />
              </div>
            </div>

            {/* Card 3: Students Engaged */}
            <div className="panel p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>Students Engaged</p>
                <h3 className="text-xl font-black mt-1" style={{ color: "var(--text-primary)" }}>
                  {totalStudentsEngaged}
                </h3>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                <Users size={18} />
              </div>
            </div>

            {/* Card 4: Conversion Rate */}
            <div className="panel p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>Conversion Ratio</p>
                <h3 className="text-xl font-black mt-1" style={{ color: "var(--text-primary)" }}>
                  {conversionRatio}
                </h3>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
                <ClipboardList size={18} />
              </div>
            </div>
          </div>

          {/* Received Invites Section (Inbound COLLEGE_TO_COMPANY) */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
              <GraduationCap size={12} />
              Received Invites ({inboundInvites.length})
            </h4>

            {inboundInvitesQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-indigo-500" /></div>
            ) : inboundInvites.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: "var(--border)" }}>
                <GraduationCap size={24} className="mx-auto mb-2 opacity-40" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No received invites yet</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  When a college's TPO sends your company a drive request, it will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {inboundInvites.map((invite: any) => {
                  const statusColors: Record<string, string> = {
                    PENDING: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
                    ACCEPTED: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
                    REJECTED: "bg-rose-500/15 text-rose-500 border-rose-500/20",
                  };
                  return (
                    <div key={invite.id} className="panel p-4 flex flex-col gap-3 hover:shadow-md transition">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <GraduationCap size={14} className="text-indigo-400 shrink-0" />
                            <span className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                              {invite.college?.name || "College"}
                            </span>
                          </div>
                          {invite.college?.city && (
                            <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                              <MapPin size={10} />
                              {[invite.college.city, invite.college.state].filter(Boolean).join(", ")}
                            </div>
                          )}
                          <p className="text-xs mt-1 font-medium" style={{ color: "var(--text-secondary)" }}>
                            Drive: <span className="font-semibold">{invite.driveTitle}</span>
                          </p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[invite.status] || "bg-slate-500/15 text-slate-500 border-slate-500/20"}`}>
                          {invite.status}
                        </span>
                      </div>

                      {/* Action buttons — only for PENDING */}
                      {invite.status === "PENDING" && (
                        <div className="flex items-center gap-2">
                          <button
                            className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center gap-1 disabled:opacity-60"
                            onClick={() => respondToInviteMutation.mutate({ inviteId: invite.id, action: "ACCEPT" })}
                            disabled={respondToInviteMutation.isPending}
                          >
                            {respondToInviteMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                            Accept
                          </button>
                          <button
                            className="flex-1 text-xs font-bold py-1.5 rounded-lg border text-rose-500 hover:bg-rose-500/10 transition flex items-center justify-center gap-1 disabled:opacity-60"
                            style={{ borderColor: "rgba(244,63,94,0.3)" }}
                            onClick={() => respondToInviteMutation.mutate({ inviteId: invite.id, action: "REJECT" })}
                            disabled={respondToInviteMutation.isPending}
                          >
                            <X size={11} />
                            Decline
                          </button>
                        </div>
                      )}

                      {/* Post-acceptance drive link */}
                      {invite.status === "ACCEPTED" && invite.placementDrive && (
                        <button
                          className="self-start text-xs font-semibold text-indigo-500 flex items-center gap-1 hover:underline"
                          onClick={() => navigate(`/recruiter/drive/${invite.placementDrive.id}`)}
                        >
                          <ArrowRight size={11} /> View Active Drive
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sent Invites Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                <Send size={12} />
                Sent Invites ({(driveInvitesQuery.data || []).length})
              </h4>
              {companyId && (
                <button
                  className="btn-primary py-1 px-3 text-xs font-semibold shrink-0 flex items-center gap-1.5"
                  onClick={() => setShowDriveInviteModal(true)}
                >
                  <Send size={12} />
                  Send Campus Invite
                </button>
              )}
            </div>

            {driveInvitesQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-indigo-500" /></div>
            ) : !driveInvitesQuery.data || driveInvitesQuery.data.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: "var(--border)" }}>
                <Send size={24} className="mx-auto mb-2 opacity-40" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No invites sent yet</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Send a campus invite to a college to start a placement drive.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {driveInvitesQuery.data.map((invite: any) => {
                  const statusColors: Record<string, string> = {
                    PENDING: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
                    ACCEPTED: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
                    REJECTED: "bg-rose-500/15 text-rose-500 border-rose-500/20",
                    WITHDRAWN: "bg-slate-500/15 text-slate-500 border-slate-500/20",
                  };
                  return (
                    <div
                      key={invite.id}
                      className="panel p-4 flex flex-col gap-2 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <GraduationCap size={14} className="text-indigo-400 shrink-0" />
                            <span className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                              {invite.college?.name || "College"}
                            </span>
                          </div>
                          {invite.college?.city && (
                            <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                              <MapPin size={10} />
                              {[invite.college.city, invite.college.state].filter(Boolean).join(", ")}
                            </div>
                          )}
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[invite.status] || "bg-slate-500/15 text-slate-500 border-slate-500/20"}`}>
                          {invite.status}
                        </span>
                      </div>

                      {invite.driveTitle && (
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          Drive: <span className="font-semibold">{invite.driveTitle}</span>
                        </p>
                      )}

                      {invite.status === "PENDING" && (
                        <button
                          className="self-start flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-400 transition"
                          onClick={() => withdrawInviteMutation.mutate(invite.id)}
                          disabled={withdrawInviteMutation.isPending}
                        >
                          {withdrawInviteMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
                          Withdraw Invite
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Drives Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
              <Trophy size={12} />
              Active Campus Drives ({postedDrives.length})
            </h4>

            {myPostedDrivesQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-indigo-500" /></div>
            ) : postedDrives.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: "var(--border)" }}>
                <GraduationCap size={24} className="mx-auto mb-2 opacity-40" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No active campus drives</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Drives are created automatically when a college accepts your invite.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {postedDrives.map((drive: any) => {
                  const driveStatusColors: Record<string, string> = {
                    OPEN: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
                    CLOSED: "bg-slate-500/15 text-slate-500 border-slate-500/20",
                    CANCELLED: "bg-rose-500/15 text-rose-500 border-rose-500/20",
                    COMPLETED: "bg-purple-500/15 text-purple-500 border-purple-500/20",
                  };
                  return (
                    <div
                      key={drive.id}
                      className="panel p-4 flex flex-col gap-3 hover:shadow-lg transition cursor-pointer group"
                      onClick={() => navigate(`/recruiter/drive/${drive.id}`)}
                    >
                      {/* Drive Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-sm truncate group-hover:text-indigo-500 transition" style={{ color: "var(--text-primary)" }}>
                            {drive.title}
                          </h5>
                          <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {drive.targetCollege?.name || "College TBD"}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${driveStatusColors[drive.status] || "bg-slate-500/15 text-slate-500 border-slate-500/20"}`}>
                          {drive.status}
                        </span>
                      </div>

                      {/* Drive Stats */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg p-2 text-center" style={{ background: "var(--bg-surface-2)" }}>
                          <div className="text-lg font-black" style={{ color: "var(--text-primary)" }}>
                            {drive._count?.applications ?? drive.applicationsCount ?? 0}
                          </div>
                          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Applicants</div>
                        </div>
                        <div className="rounded-lg p-2 text-center" style={{ background: "var(--bg-surface-2)" }}>
                          <div className="text-lg font-black" style={{ color: "var(--text-primary)" }}>
                            {drive.driveType || "FULL_TIME"}
                          </div>
                          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Type</div>
                        </div>
                      </div>

                      {/* Drive Date */}
                      {drive.driveDate && (
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                          <Calendar size={11} />
                          {new Date(drive.driveDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      )}

                      {/* View Applicants CTA */}
                      <button
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold transition hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-500"
                        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/recruiter/drive/${drive.id}`); }}
                      >
                        View Applicants <ArrowRight size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TALENT SEARCH (RESDEX) TAB */}
      {activeTab === "search" && (
        <div className="space-y-6">
          {/* Quota Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 panel p-5 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/40 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-blue-950/20">
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                <Sparkles className="h-5 w-5 text-indigo-600 animate-pulse" />
                Resdex Candidate Search Engine
              </h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Query our unified student resdex index with fine-grained academic and experience filters.
              </p>
            </div>

            {resdexQuery.data?.searchLimitInfo && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                    Daily Search Quota: {resdexQuery.data.searchLimitInfo.currentCount}/{resdexQuery.data.searchLimitInfo.dailyLimit} Used
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {resdexQuery.data.searchLimitInfo.isLimited && resdexQuery.data.searchLimitInfo.currentCount >= resdexQuery.data.searchLimitInfo.dailyLimit
                      ? "Search limit reached today"
                      : `${resdexQuery.data.searchLimitInfo.dailyLimit - resdexQuery.data.searchLimitInfo.currentCount} free searches remaining`}
                  </p>
                </div>
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex p-0.5 border border-gray-300 dark:border-gray-700">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${resdexQuery.data.searchLimitInfo.isLimited && resdexQuery.data.searchLimitInfo.currentCount >= resdexQuery.data.searchLimitInfo.dailyLimit ? "bg-red-500" : "bg-indigo-600"}`}
                    style={{ width: `${Math.min((resdexQuery.data.searchLimitInfo.currentCount / resdexQuery.data.searchLimitInfo.dailyLimit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1 panel p-5 space-y-5" style={{ background: "var(--bg-surface)" }}>
              <h4 className="font-bold text-sm text-gray-900 dark:text-white pb-2 border-b" style={{ borderColor: "var(--border)" }}>
                Search Filters
              </h4>

              <div className="space-y-4 text-xs">
                {/* Text query */}
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-705 dark:text-gray-300">Fuzzy Query</label>
                  <input
                    type="text"
                    disabled={resdexQuery.data?.searchLimitInfo?.isLimited && resdexQuery.data?.searchLimitInfo?.currentCount >= resdexQuery.data?.searchLimitInfo?.dailyLimit}
                    placeholder="Search name, description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors text-gray-900 dark:text-white"
                  />
                </div>

                {/* Skills array input */}
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-705 dark:text-gray-300">Required Skills</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      disabled={resdexQuery.data?.searchLimitInfo?.isLimited && resdexQuery.data?.searchLimitInfo?.currentCount >= resdexQuery.data?.searchLimitInfo?.dailyLimit}
                      placeholder="e.g. React"
                      value={newSkillTag}
                      onChange={(e) => setNewSkillTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newSkillTag.trim()) {
                          e.preventDefault();
                          if (!searchSkills.includes(newSkillTag.trim())) {
                            setSearchSkills([...searchSkills, newSkillTag.trim()]);
                          }
                          setNewSkillTag("");
                        }
                      }}
                      className="flex-1 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-955 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors text-gray-905 dark:text-white"
                    />
                    <button
                      type="button"
                      disabled={(resdexQuery.data?.searchLimitInfo?.isLimited && resdexQuery.data?.searchLimitInfo?.currentCount >= resdexQuery.data?.searchLimitInfo?.dailyLimit) || !newSkillTag.trim()}
                      onClick={() => {
                        if (newSkillTag.trim() && !searchSkills.includes(newSkillTag.trim())) {
                          setSearchSkills([...searchSkills, newSkillTag.trim()]);
                        }
                        setNewSkillTag("");
                      }}
                      className="bg-slate-900 hover:bg-black dark:bg-slate-800 text-white px-3 rounded-xl border dark:border-gray-700"
                    >
                      Add
                    </button>
                  </div>

                  {searchSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {searchSkills.map((sk) => (
                        <span
                          key={sk}
                          className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-md flex items-center gap-1"
                        >
                          {sk}
                          <button
                            type="button"
                            onClick={() => setSearchSkills(searchSkills.filter((s) => s !== sk))}
                            className="text-indigo-400 hover:text-indigo-600 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Min CGPA */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold text-gray-750 dark:text-gray-300">
                    <span>Min CGPA</span>
                    <span>{searchMinCgpa !== undefined ? searchMinCgpa.toFixed(1) : "Any"}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    disabled={resdexQuery.data?.searchLimitInfo?.isLimited && resdexQuery.data?.searchLimitInfo?.currentCount >= resdexQuery.data?.searchLimitInfo?.dailyLimit}
                    value={searchMinCgpa !== undefined ? searchMinCgpa : 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSearchMinCgpa(val > 0 ? val : undefined);
                    }}
                    className="w-full accent-indigo-600"
                  />
                </div>

                {/* Graduation Year */}
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-750 dark:text-gray-300">Graduation Year</label>
                  <select
                    disabled={resdexQuery.data?.searchLimitInfo?.isLimited && resdexQuery.data?.searchLimitInfo?.currentCount >= resdexQuery.data?.searchLimitInfo?.dailyLimit}
                    value={searchGradYear || ""}
                    onChange={(e) => setSearchGradYear(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="w-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-955 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors text-gray-905 dark:text-white"
                  >
                    <option value="">Any Batch</option>
                    <option value="2024">Class of 2024</option>
                    <option value="2025">Class of 2025</option>
                    <option value="2026">Class of 2026</option>
                    <option value="2027">Class of 2027</option>
                  </select>
                </div>

                {/* College Name */}
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-750 dark:text-gray-300">College Name</label>
                  <input
                    type="text"
                    disabled={resdexQuery.data?.searchLimitInfo?.isLimited && resdexQuery.data?.searchLimitInfo?.currentCount >= resdexQuery.data?.searchLimitInfo?.dailyLimit}
                    placeholder="e.g. IIT Delhi"
                    value={searchCollegeName}
                    onChange={(e) => setSearchCollegeName(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors text-gray-905 dark:text-white"
                  />
                </div>

                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-750 dark:text-gray-300">Past/Current Employer</label>
                  <input
                    type="text"
                    disabled={resdexQuery.data?.searchLimitInfo?.isLimited && resdexQuery.data?.searchLimitInfo?.currentCount >= resdexQuery.data?.searchLimitInfo?.dailyLimit}
                    placeholder="e.g. Amazon"
                    value={searchCompanyName}
                    onChange={(e) => setSearchCompanyName(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors text-gray-905 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Candidate Listing Panel */}
            <div className="lg:col-span-3 space-y-6 relative">
              {resdexQuery.data?.searchLimitInfo?.isLimited && resdexQuery.data?.searchLimitInfo?.currentCount >= resdexQuery.data?.searchLimitInfo?.dailyLimit ? (
                <div className="panel p-8 text-center bg-white/70 dark:bg-gray-900/60 backdrop-blur-md border border-red-200 dark:border-red-950 rounded-2xl shadow-xl space-y-6 min-h-[400px] flex flex-col items-center justify-center relative z-20">
                  <div className="h-16 w-16 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-full flex items-center justify-center text-red-650 dark:text-red-400">
                    <Lock className="h-8 w-8 animate-pulse" />
                  </div>
                  <div className="max-w-md space-y-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Daily Limit Reached</h3>
                    <p className="text-sm text-gray-500 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      You have exhausted your 5 free searches for today. Upgrade to a Premium Recruiter Seat for unlimited searches and direct candidate contact.
                    </p>
                  </div>
                  <Link
                    to="/business"
                    className="inline-flex items-center gap-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors shadow-md shadow-indigo-600/10"
                  >
                    Unlock Unlimited Resdex Access
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : resdexQuery.isLoading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                  <InlineLoader label="Querying talent database..." />
                </div>
              ) : resdexQuery.isError ? (
                <ErrorState title="Error fetching candidates" onRetry={() => resdexQuery.refetch()} />
              ) : !resdexQuery.data?.candidates || resdexQuery.data.candidates.length === 0 ? (
                <div className="panel p-12 text-center text-gray-400 text-sm border rounded-2xl">
                  No candidates match your queries. Try broadening your filter selections.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {resdexQuery.data.candidates.map((candidate: any) => {
                    const safeProfile = candidate.profile || {};
                    const currentExperience = candidate.experiences?.find((e: any) => e.isCurrent);
                    const education = candidate.educations?.[0];

                    return (
                      <div
                        key={candidate.id}
                        className="panel p-6 flex flex-col justify-between hover:shadow-md transition duration-200"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                      >
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="h-11 w-11 bg-gray-50 dark:bg-gray-950 border border-gray-150 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                              {safeProfile.avatarUrl ? (
                                <img src={safeProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="text-indigo-700 dark:text-indigo-400 font-bold text-sm">
                                  {safeProfile.fullName?.charAt(0) || candidate.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-bold text-sm text-gray-950 dark:text-white truncate flex items-center gap-1.5">
                                {safeProfile.fullName || `@${candidate.username}`}
                                {candidate.verifiedEngineer && (
                                  <span className="bg-blue-50 dark:bg-blue-955/35 text-blue-700 dark:text-blue-300 text-[8px] font-extrabold px-1 rounded border border-blue-200 dark:border-blue-800 shrink-0">
                                    VERIFIED
                                  </span>
                                )}
                              </h5>
                              <p className="text-[11px] font-medium truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>
                                {safeProfile.headline || "Software Engineer"}
                              </p>
                            </div>
                          </div>

                          {safeProfile.about && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                              {safeProfile.about}
                            </p>
                          )}

                          <div className="space-y-1.5 text-[11px] text-gray-605 dark:text-gray-405 bg-gray-50/50 dark:bg-gray-950/20 p-2.5 rounded-xl border border-gray-150 dark:border-gray-85">
                            {education && (
                              <p className="truncate">
                                <strong>School:</strong> {education.collegeName || "College"} ({education.endYear})
                              </p>
                            )}
                            {currentExperience ? (
                              <p className="truncate">
                                <strong>Current:</strong> {currentExperience.title} @ {currentExperience.companyName}
                              </p>
                            ) : (
                              <p>Open to placement opportunities</p>
                            )}
                          </div>

                          {candidate.skills?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {candidate.skills.slice(0, 3).map((us: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 bg-gray-55 dark:bg-gray-95 border border-gray-150 text-[10px] text-gray-600 rounded-md"
                                >
                                  {us.skill?.name || us}
                                </span>
                              ))}
                              {candidate.skills.length > 3 && (
                                <span className="px-1.5 py-0.5 bg-gray-55 dark:bg-gray-95 border border-gray-150 text-[10px] text-gray-400 rounded-md">
                                  +{candidate.skills.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="border-t border-gray-150 dark:border-gray-85 pt-3 mt-4 flex justify-between items-center text-[11px]">
                          <span className="font-bold text-gray-705 dark:text-gray-300">
                            Score: <span className="text-blue-650 font-black">⚡{Math.round(candidate.engineeringScore || 0)}</span>
                          </span>

                          <Link
                            to={`/users/${candidate.username}`}
                            className="text-indigo-650 hover:text-indigo-850 font-bold inline-flex items-center gap-0.5"
                          >
                            Profile Details <ArrowRight size={10} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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
