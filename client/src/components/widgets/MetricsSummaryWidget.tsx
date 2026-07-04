import { useLocation, Link } from "react-router-dom";
import {
  Users,
  Briefcase,
  FileText,
  CheckCircle2,
  MonitorPlay,
  type LucideIcon,
  Trophy,
  FolderGit2,
  UserCheck,
  CalendarCheck,
} from "lucide-react";
import { useAuth } from "../../core/contexts/AuthContext";
import { isRecruiter } from "../../core/utils/roles";
import {
  useMyProjectsQuery,
  useMyTeamsQuery,
  useMyDriveApplicationsQuery,
  useRecruiterJobsQuery,
  useMyJobApplicationsQuery,
  useMyExternalApplicationsQuery,
  useMyFullProfileQuery,
} from "../../hooks/usePlatformQueries";
import { StatCard } from "../ui";
import { User } from "../../lib/api";

// ─── Profile Strength Computation ────────────────────────────────────────────

function computeProfileStrength(profile: User): number {
  let score = 0;

  // Avatar photo: +10%
  if (profile.profile?.avatarUrl) score += 10;

  // Bio/headline: +5%
  if (profile.profile?.bio || profile.profile?.headline) score += 5;

  // ≥5 verified skills: +20%
  const verifiedSkillCount = (profile.skills || []).filter((s) => s.verified).length;
  if (verifiedSkillCount >= 5) score += 20;

  // Education: verified +20%, unverified +10%
  const educations = profile.educations || [];
  if (educations.length > 0) {
    const hasVerifiedEdu = educations.some((e) => e.collegeEmailVerified);
    score += hasVerifiedEdu ? 20 : 10;
  }

  // GitHub linked: +10%
  if (profile.profile?.githubUrl) score += 10;

  // ≥1 GitHub-verified project (project has verified=true): +10%
  const ownedProjects = profile.ownedProjects || [];
  const hasVerifiedProject = ownedProjects.some((p) => p.verified && p.githubUrl);
  if (hasVerifiedProject) score += 10;

  // ≥1 verified experience: +20%
  const experiences = profile.experiences || [];
  const hasVerifiedExp = experiences.some((e) => e.verified);
  if (hasVerifiedExp) score += 20;

  // Has coding profile: +5%
  const codingProfiles = profile.codingProfiles || [];
  if (codingProfiles.length > 0) score += 5;

  return Math.min(score, 100);
}

function strengthLabel(pct: number): { label: string; color: string } {
  if (pct >= 80) return { label: "Strong", color: "#22c55e" };
  if (pct >= 50) return { label: "Good", color: "#f59e0b" };
  return { label: "Needs Work", color: "#f87171" };
}

// ─── Circular Progress Ring ───────────────────────────────────────────────────

function ProfileStrengthRing({ percent }: { percent: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const { label, color } = strengthLabel(percent);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={72} height={72} className="-rotate-90">
        {/* Track */}
        <circle
          cx={36}
          cy={36}
          r={radius}
          fill="none"
          stroke="var(--bg-surface-3)"
          strokeWidth={5}
        />
        {/* Progress */}
        <circle
          cx={36}
          cy={36}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span
          className="text-base font-black leading-none"
          style={{ color: "var(--text-primary)" }}
        >
          {percent}%
        </span>
      </div>
    </div>
  );
}

// ─── Profile Strength Metric Card ────────────────────────────────────────────

function ProfileStrengthCard({ profile }: { profile: User }) {
  const percent = computeProfileStrength(profile);
  const { label, color } = strengthLabel(percent);

  return (
    <Link to="/career/profile" className="block no-underline h-full">
      <div
        className="panel p-4 h-full flex items-center justify-between border rounded-2xl hover-lift transition-all duration-200 border-[color:var(--border)]"
        style={{ background: "var(--bg-surface)" }}
      >
        <div className="flex flex-col gap-1">
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            Profile Strength
          </span>
          <span
            className="text-2xl font-black leading-none"
            style={{ color: "var(--text-primary)" }}
          >
            {percent}%
          </span>
          <span
            className="text-xs font-bold"
            style={{ color }}
          >
            {label}
          </span>
        </div>
        <ProfileStrengthRing percent={percent} />
      </div>
    </Link>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function MetricsSummaryWidget() {
  const location = useLocation();
  const { user } = useAuth();
  const recruiter = isRecruiter(user);
  const isCareerWorkspace = location.pathname.startsWith("/career");

  // --- Campus Dashboard Queries ---
  const campusProjects = useMyProjectsQuery();
  const campusTeams = useMyTeamsQuery();
  const campusDrives = useMyDriveApplicationsQuery();

  // --- Career Recruiter Queries ---
  const recruiterJobs = useRecruiterJobsQuery();

  // --- Career Student Queries ---
  const studentJobApplications = useMyJobApplicationsQuery();
  const studentExternalApps = useMyExternalApplicationsQuery();
  const fullProfile = useMyFullProfileQuery();

  // --- Determine loading and content states ---
  const isCampusLoading = campusProjects.isLoading || campusTeams.isLoading || campusDrives.isLoading;
  const isRecruiterLoading = recruiterJobs.isLoading;
  const isStudentLoading =
    studentJobApplications.isLoading || studentExternalApps.isLoading || fullProfile.isLoading;

  const isLoading = isCareerWorkspace
    ? recruiter ? isRecruiterLoading : isStudentLoading
    : isCampusLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="panel p-4 h-24 flex items-center justify-between border rounded-2xl animate-pulse bg-[color:var(--bg-surface)] border-[color:var(--border)]" />
        ))}
      </div>
    );
  }

  // ─── Campus Stats ────────────────────────────────────────────────────────

  if (!isCareerWorkspace) {
    const stats: Array<{ label: string; value: number | string; icon: LucideIcon; to?: string }> = [
      { label: "Projects", value: campusProjects.data?.length ?? 0, icon: FolderGit2, to: "/campus/projects" },
      { label: "Team Members", value: campusTeams.data?.length ?? 0, icon: Users, to: "/campus/teams" },
      { label: "Hackathons", value: 0, icon: Trophy, to: "/campus/hackathons" },
      { label: "Placement Drives", value: campusDrives.data?.length ?? 0, icon: Briefcase, to: "/campus/placements" },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const cardContent = (
            <StatCard
              label={stat.label}
              value={stat.value}
              icon={Icon}
              className="border-[color:var(--border)] hover-lift h-full"
            />
          );

          if (stat.to) {
            return (
              <Link key={idx} to={stat.to} className="block no-underline h-full">
                {cardContent}
              </Link>
            );
          }

          return <div key={idx} className="h-full">{cardContent}</div>;
        })}
      </div>
    );
  }

  // ─── Recruiter Stats ─────────────────────────────────────────────────────

  if (recruiter) {
    const jobs = recruiterJobs.data || [];
    const totalApplicants = jobs.reduce((acc, job) => acc + (job.applicationsCount || 0), 0);

    const stats: Array<{ label: string; value: number | string; icon: LucideIcon; to?: string }> = [
      { label: "Active Job Posts", value: jobs.length, icon: Briefcase, to: "/career/recruiter" },
      { label: "Total Applicants", value: totalApplicants, icon: Users, to: "/career/recruiter" },
      { label: "Shortlisted", value: Math.round(totalApplicants * 0.2), icon: CheckCircle2, to: "/career/recruiter" },
      { label: "Interviews", value: Math.round(totalApplicants * 0.1), icon: MonitorPlay, to: "/career/recruiter" },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const cardContent = (
            <StatCard
              label={stat.label}
              value={stat.value}
              icon={Icon}
              className="border-[color:var(--border)] hover-lift h-full"
            />
          );

          if (stat.to) {
            return (
              <Link key={idx} to={stat.to} className="block no-underline h-full">
                {cardContent}
              </Link>
            );
          }

          return <div key={idx} className="h-full">{cardContent}</div>;
        })}
      </div>
    );
  }

  // ─── Career Student Stats (New Design) ───────────────────────────────────

  const platformApps = studentJobApplications.data || [];
  const externalApps = studentExternalApps.data || [];
  const totalApps = platformApps.length + externalApps.length;

  // Apps this week
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const appsThisWeek = [
    ...platformApps.filter((a) => new Date(a.createdAt || "").getTime() > oneWeekAgo),
    ...externalApps.filter((a) => new Date((a as any).createdAt || "").getTime() > oneWeekAgo),
  ].length;

  // Shortlisted
  const shortlisted = platformApps.filter((a) => a.status === "SHORTLISTED").length;
  const newShortlisted = platformApps.filter(
    (a) =>
      a.status === "SHORTLISTED" &&
      new Date(a.updatedAt || "").getTime() > oneWeekAgo
  ).length;

  // Interviews
  const interviews = platformApps.filter(
    (a) => a.status === "INTERVIEW" || a.status?.startsWith("INTERVIEW")
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">

      {/* Applications */}
      <Link to="/career/jobs?tab=applications" className="block no-underline h-full">
        <div
          className="panel p-4 h-full flex items-center justify-between border rounded-2xl hover-lift transition-all duration-200 border-[color:var(--border)]"
          style={{ background: "var(--bg-surface)" }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Applications
            </span>
            <span className="text-2xl font-black leading-none" style={{ color: "var(--text-primary)" }}>
              {totalApps}
            </span>
            {appsThisWeek > 0 && (
              <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                +{appsThisWeek} this week
              </span>
            )}
          </div>
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(99,102,241,0.12)", color: "var(--brand)" }}
          >
            <FileText size={18} />
          </div>
        </div>
      </Link>

      {/* Shortlisted */}
      <Link to="/career/jobs?tab=applications&status=SHORTLISTED" className="block no-underline h-full">
        <div
          className="panel p-4 h-full flex items-center justify-between border rounded-2xl hover-lift transition-all duration-200 border-[color:var(--border)]"
          style={{ background: "var(--bg-surface)" }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Shortlisted
            </span>
            <span className="text-2xl font-black leading-none" style={{ color: "var(--text-primary)" }}>
              {shortlisted}
            </span>
            {newShortlisted > 0 && (
              <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                {newShortlisted} new
              </span>
            )}
          </div>
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(20,184,166,0.12)", color: "#14b8a6" }}
          >
            <UserCheck size={18} />
          </div>
        </div>
      </Link>

      {/* Interviews */}
      <Link to="/career/interviews" className="block no-underline h-full">
        <div
          className="panel p-4 h-full flex items-center justify-between border rounded-2xl hover-lift transition-all duration-200 border-[color:var(--border)]"
          style={{ background: "var(--bg-surface)" }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Interviews
            </span>
            <span className="text-2xl font-black leading-none" style={{ color: "var(--text-primary)" }}>
              {interviews}
            </span>
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Upcoming
            </span>
          </div>
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}
          >
            <CalendarCheck size={18} />
          </div>
        </div>
      </Link>

      {/* Profile Strength */}
      {fullProfile.data ? (
        <ProfileStrengthCard profile={fullProfile.data} />
      ) : (
        <div className="panel p-4 h-24 flex items-center justify-between border rounded-2xl animate-pulse bg-[color:var(--bg-surface)] border-[color:var(--border)]" />
      )}

    </div>
  );
}
