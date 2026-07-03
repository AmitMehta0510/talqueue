import { Rocket, Users, Gavel, Briefcase } from "lucide-react";
import {
  useMyProjectsQuery,
  useMyTeamsQuery,
  useMyDriveApplicationsQuery,
} from "../../hooks/usePlatformQueries";
import { StatCard } from "../ui";

export function MetricsSummaryWidget() {
  const { data: projects, isLoading: isProjectsLoading } = useMyProjectsQuery();
  const { data: teams, isLoading: isTeamsLoading } = useMyTeamsQuery();
  const { data: driveApps, isLoading: isAppsLoading } = useMyDriveApplicationsQuery();

  const isLoading = isProjectsLoading || isTeamsLoading || isAppsLoading;

  const stats = [
    {
      label: "Projects Showcase",
      value: projects?.length ?? 0,
      icon: Rocket,
      colorClass: "text-brand bg-brand-light",
    },
    {
      label: "Teams Organized",
      value: teams?.length ?? 0,
      icon: Users,
      colorClass: "text-blue-500 bg-blue-50 dark:bg-blue-950/20",
    },
    {
      label: "Hackathons Enrolled",
      value: 0, // Fallback default, will be enriched in Phase 5
      icon: Gavel,
      colorClass: "text-amber-500 bg-amber-50 dark:bg-amber-950/20",
    },
    {
      label: "Active Placements",
      value: driveApps?.length ?? 0,
      icon: Briefcase,
      colorClass: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="panel p-4 h-24 flex items-center justify-between border rounded-2xl animate-pulse bg-[color:var(--bg-surface)] border-[color:var(--border)]" />
        ))}
      </div>
    );
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
            icon={stat.icon}
            className="border-[color:var(--border)] hover-lift"
          />
        );
      })}
    </div>
  );
}
