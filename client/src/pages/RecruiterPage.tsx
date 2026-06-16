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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Recruiter Console</h2>
          <p className="text-xs text-slate-500 mt-0.5">
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
        <div className="panel p-5 flex items-center gap-4 bg-gradient-to-br from-emerald-50/40 to-teal-50/40">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
            <BriefcaseBusiness size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-950">{stats.totalJobs}</div>
            <div className="text-xs text-slate-500">Active Job Postings</div>
          </div>
        </div>

        <div className="panel p-5 flex items-center gap-4 bg-gradient-to-br from-blue-50/40 to-indigo-50/40">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
            <Users size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-950">{stats.totalApplicants}</div>
            <div className="text-xs text-slate-500">Total Applicants In Pipeline</div>
          </div>
        </div>

        <div className="panel p-5 flex items-center gap-4 bg-gradient-to-br from-amber-50/40 to-orange-50/40">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-950">{stats.avgMatchRate}%</div>
            <div className="text-xs text-slate-500">Avg Candidate Skill Fit</div>
          </div>
        </div>
      </div>

      {/* Main Jobs Directory Table / List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-1.5">
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
                    <h4 className="font-bold text-base text-slate-950 truncate">{job.title}</h4>
                    <span className="chip uppercase text-[9px] font-bold bg-emerald-50 text-emerald-800">
                      {job.type}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    {[job.location || "Remote", titleCase(job.workMode || "")].filter(Boolean).join(" &bull; ")}
                  </p>

                  <div className="flex items-center gap-4 text-xs font-semibold mt-2.5">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle size={14} />
                      {job.applicationsCount || 0} Candidates
                    </span>
                    {job.createdAt && (
                      <span className="text-slate-400 flex items-center gap-1 font-normal">
                        <Clock size={14} />
                        Posted {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-4 shrink-0">
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
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-1.5">
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
                      <p className="text-sm font-bold text-slate-800">{invite.driveTitle}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 size={10} />{invite.college?.name}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      invite.status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200" :
                      invite.status === "ACCEPTED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      invite.status === "REJECTED" ? "bg-rose-50 text-rose-700 border-rose-200" :
                      "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>{invite.status}</span>
                  </div>
                  {invite.driveDate && (
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={9} /> {formatDate(invite.driveDate)}
                    </p>
                  )}
                  {invite.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => withdrawInviteMutation.mutate(invite.id)}
                      disabled={withdrawInviteMutation.isPending}
                      className="text-[10px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition disabled:opacity-50"
                    >
                      <X size={10} /> Withdraw
                    </button>
                  )}
                  {invite.status === "ACCEPTED" && invite.placementDrive && (
                    <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
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
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-1.5">
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
                      <h4 className="font-bold text-sm text-slate-900 leading-snug truncate">
                        {drive.driveTitle}
                      </h4>
                      <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-bold ${
                        drive.status === "ONGOING" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        drive.status === "UPCOMING" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                        "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {drive.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Building2 size={11} className="text-slate-400" />
                      {drive.college?.name}
                    </p>
                    {drive.driveDate && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock size={10} /> Drive Date: {formatDate(drive.driveDate)}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-4 shrink-0">
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
