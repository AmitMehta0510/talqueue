import { useState, useMemo } from "react";
import {
  BriefcaseBusiness,
  Users,
  Award,
  Sparkles,
  ChevronRight,
  TrendingUp,
  FolderKanban,
  CheckCircle,
  Clock,
  Plus,
  GraduationCap,
  Send,
  X,
  Loader2,
  Building2,
} from "lucide-react";
import {
  useRecruiterDashboardQuery,
  useRecruiterInsightsQuery,
  useRecruiterJobsQuery,
  useDriveInvitesForCompanyQuery,
  useWithdrawDriveInviteMutation,
  useMyPostedDrivesQuery,
} from "../hooks/usePlatformQueries";
import { DriveApplicantsModal } from "../components/jobs/DriveApplicantsModal";
import { useAuth } from "../contexts/AuthContext";
import { EmptyState, InlineLoader, ErrorState } from "../components/ui";
import { KanbanPipeline } from "../components/recruiter/KanbanPipeline";
import { JobPostModal } from "../components/forms/JobPostModal";
import { DriveInviteModal } from "../components/jobs/DriveInviteModal";
import { formatCount, titleCase, formatDate } from "../lib/format";
import { Job } from "../lib/api";

export function RecruiterPage() {
  const { user } = useAuth();
  const [managedJobId, setManagedJobId] = useState<string | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showDriveInviteModal, setShowDriveInviteModal] = useState(false);
  const [selectedDriveForApplicants, setSelectedDriveForApplicants] = useState<{ id: string; title: string } | null>(null);

  const dashboardQuery = useRecruiterDashboardQuery();
  const insightsQuery = useRecruiterInsightsQuery();
  const jobsQuery = useRecruiterJobsQuery();

  // Detect the recruiter's primary company (first admin or experience company)
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
  const dashboard = dashboardQuery.data;
  const insights = insightsQuery.data;

  // Calculate stats
  const stats = useMemo(() => {
    const totalJobs = activeJobs.length;
    const totalApplicants = activeJobs.reduce((acc, job) => acc + (job.applicationsCount || 0), 0);
    const avgMatchRate = 78; // complement match rate estimate or defaults
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

      {showPostModal && (
        <JobPostModal
          onClose={() => setShowPostModal(false)}
          onSuccess={() => {
            jobsQuery.refetch();
            dashboardQuery.refetch();
          }}
        />
      )}

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

      {showDriveInviteModal && companyId && (
        <DriveInviteModal
          companyId={companyId}
          companyName={recruiterCompany?.name || "Your Company"}
          onClose={() => setShowDriveInviteModal(false)}
        />
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
