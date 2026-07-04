import { useLocation, Link } from "react-router-dom";
import { Gift, Users, Briefcase, FileText, CheckCircle2, MonitorPlay, type LucideIcon, Trophy, FolderGit2 } from "lucide-react";
import { useAuth } from "../../core/contexts/AuthContext";
import { isRecruiter } from "../../core/utils/roles";
import {
  useMyProjectsQuery,
  useMyTeamsQuery,
  useMyDriveApplicationsQuery,
  useRecruiterJobsQuery,
  useSuggestedJobsQuery,
  useMyJobApplicationsQuery,
  useMyExternalApplicationsQuery,
} from "../../hooks/usePlatformQueries";
import { StatCard } from "../ui";

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
  const studentSuggestedJobs = useSuggestedJobsQuery();
  const studentJobApplications = useMyJobApplicationsQuery();
  const studentExternalApps = useMyExternalApplicationsQuery();

  // --- Determine loading and content states ---
  const isCampusLoading = campusProjects.isLoading || campusTeams.isLoading || campusDrives.isLoading;
  const isRecruiterLoading = recruiterJobs.isLoading;
  const isStudentLoading = studentSuggestedJobs.isLoading || studentJobApplications.isLoading || studentExternalApps.isLoading;

  const isLoading = isCareerWorkspace
    ? (recruiter ? isRecruiterLoading : isStudentLoading)
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

  // --- Metric arrays generation ---
  let stats: Array<{ label: string; value: number | string; icon: LucideIcon; to?: string }> = [];

  if (!isCareerWorkspace) {
    stats = [
      {
        label: "Projects",
        value: campusProjects.data?.length ?? 0,
        icon: FolderGit2,
        to: "/campus/projects",
      },
      {
        label: "Team Members",
        value: campusTeams.data?.length ?? 0,
        icon: Users,
        to: "/campus/teams",
      },
      {
        label: "Hackathons",
        value: 0,
        icon: Trophy,
        to: "/campus/hackathons",
      },
      {
        label: "Placement Drives",
        value: campusDrives.data?.length ?? 0,
        icon: Briefcase,
        to: "/campus/placements",
      },
    ];
  } else if (recruiter) {
    const jobs = recruiterJobs.data || [];
    const totalApplicants = jobs.reduce((acc, job) => acc + (job.applicationsCount || 0), 0);

    stats = [
      {
        label: "Active Job Posts",
        value: jobs.length,
        icon: Briefcase,
        to: "/career/recruiter",
      },
      {
        label: "Total Applicants",
        value: totalApplicants,
        icon: Users,
        to: "/career/recruiter",
      },
      {
        label: "Shortlisted",
        value: Math.round(totalApplicants * 0.2), // Mock pipeline estimate
        icon: CheckCircle2,
        to: "/career/recruiter",
      },
      {
        label: "Interviews",
        value: Math.round(totalApplicants * 0.1), // Mock pipeline estimate
        icon: MonitorPlay,
        to: "/career/recruiter",
      },
    ];
  } else {
    const platformApps = studentJobApplications.data || [];
    const externalApps = studentExternalApps.data || [];
    const totalApplications = platformApps.length + externalApps.length;
    const interviews = platformApps.filter((app) => app.status?.startsWith("INTERVIEW")).length;
    const offersReceived = externalApps.filter((app) => app.status === "OFFER_RECEIVED").length;

    stats = [
      {
        label: "Suggested Jobs",
        value: studentSuggestedJobs.data?.length ?? 0,
        icon: Briefcase,
        to: "/career/jobs",
      },
      {
        label: "Applications Sent",
        value: totalApplications,
        icon: FileText,
        to: "/career/jobs?tab=applications",
      },
      {
        label: "Interviews Booked",
        value: interviews,
        icon: MonitorPlay,
        to: "/career/interviews",
      },
      {
        label: "Offers Received",
        value: offersReceived,
        icon: Gift,
        to: "/career/jobs?tab=applications",
      },
    ];
  }

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

        return (
          <div key={idx} className="h-full">
            {cardContent}
          </div>
        );
      })}
    </div>
  );
}
