import { useLocation } from "react-router-dom";
import { Rocket, Users, Gavel, Briefcase, FileText, CheckCircle2, MonitorPlay, type LucideIcon } from "lucide-react";
import { useAuth } from "../../core/contexts/AuthContext";
import { isRecruiter } from "../../core/utils/roles";
import {
  useMyProjectsQuery,
  useMyTeamsQuery,
  useMyDriveApplicationsQuery,
  useRecruiterJobsQuery,
  useSuggestedJobsQuery,
  useMyJobApplicationsQuery,
  useMyFullProfileQuery,
  usePlacementDrivesForCollegeQuery,
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
  const studentProfile = useMyFullProfileQuery();
  const studentCollegeId = studentProfile.data?.profile?.collegeId;
  const studentPlacementDrives = usePlacementDrivesForCollegeQuery(studentCollegeId);

  // --- Determine loading and content states ---
  const isCampusLoading = campusProjects.isLoading || campusTeams.isLoading || campusDrives.isLoading;
  const isRecruiterLoading = recruiterJobs.isLoading;
  const isStudentLoading = studentSuggestedJobs.isLoading || studentJobApplications.isLoading || studentProfile.isLoading || studentPlacementDrives.isLoading;

  const isLoading = isCareerWorkspace
    ? (recruiter ? isRecruiterLoading : isStudentLoading)
    : isCampusLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="panel p-4 h-24 flex items-center justify-between border rounded-2xl animate-pulse bg-[color:var(--bg-surface)] border-[color:var(--border)]" />
        ))}
      </div>
    );
  }

  // --- Metric arrays generation ---
  let stats: Array<{ label: string; value: number | string; icon: LucideIcon }> = [];

  if (!isCareerWorkspace) {
    stats = [
      {
        label: "Projects Showcase",
        value: campusProjects.data?.length ?? 0,
        icon: Rocket,
      },
      {
        label: "Teams Organized",
        value: campusTeams.data?.length ?? 0,
        icon: Users,
      },
      {
        label: "Hackathons Enrolled",
        value: 0,
        icon: Gavel,
      },
      {
        label: "Active Placements",
        value: campusDrives.data?.length ?? 0,
        icon: Briefcase,
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
      },
      {
        label: "Total Applicants",
        value: totalApplicants,
        icon: Users,
      },
      {
        label: "Shortlisted",
        value: Math.round(totalApplicants * 0.2), // Mock pipeline estimate
        icon: CheckCircle2,
      },
      {
        label: "Interviews",
        value: Math.round(totalApplicants * 0.1), // Mock pipeline estimate
        icon: MonitorPlay,
      },
    ];
  } else {
    const apps = studentJobApplications.data || [];
    const interviews = apps.filter((app) => app.status?.startsWith("INTERVIEW")).length;

    stats = [
      {
        label: "Suggested Jobs",
        value: studentSuggestedJobs.data?.length ?? 0,
        icon: Briefcase,
      },
      {
        label: "Applications Sent",
        value: apps.length,
        icon: FileText,
      },
      {
        label: "Interviews Booked",
        value: interviews,
        icon: MonitorPlay,
      },
      {
        label: "Active Drives",
        value: studentPlacementDrives.data?.length ?? 0,
        icon: Rocket,
      },
    ];
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <StatCard
            key={idx}
            label={stat.label}
            value={stat.value}
            icon={Icon}
            className="border-[color:var(--border)] hover-lift"
          />
        );
      })}
    </div>
  );
}
