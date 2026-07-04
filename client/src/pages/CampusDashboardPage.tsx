import React from "react";
import { WelcomeBanner } from "../components/widgets/WelcomeBanner";
import { MetricsSummaryWidget } from "../components/widgets/MetricsSummaryWidget";
import { YourProjectsWidget } from "../components/widgets/YourProjectsWidget";
import { UpcomingEventsWidget } from "../components/widgets/UpcomingEventsWidget";
import { PlacementDrivesWidget } from "../components/widgets/PlacementDrivesWidget";
import { useMyFullProfileQuery } from "../hooks/usePlatformQueries";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function CampusDashboardPage() {
  const { data: profile } = useMyFullProfileQuery();
  const hasResume = !!profile?.profile?.resumeUrl;

  return (
    <div className="flex-1 min-w-0 space-y-6">
      {/* Top welcome splash header */}
      <WelcomeBanner />

      {/* Resume Missing Warning Banner */}
      {!hasResume && profile && (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
            <span>
              <strong>Resume Required:</strong> You haven't uploaded your resume yet. Recruiters won't be able to view your profile for campus drives.
            </span>
          </div>
          <Link
            to="/campus/profile"
            className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300 hover:underline shrink-0"
          >
            Upload Resume Now
            <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Spanned Metrics Summary Row */}
      <MetricsSummaryWidget />

      {/* 3-Column Grid Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <PlacementDrivesWidget />
        <YourProjectsWidget />
        <UpcomingEventsWidget />
      </div>
    </div>
  );
}

export default CampusDashboardPage;
