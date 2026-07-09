import { WelcomeBanner } from "../components/widgets/WelcomeBanner";
import { MetricsSummaryWidget } from "../components/widgets/MetricsSummaryWidget";
import { RecentApplicationsWidget } from "../components/widgets/RecentApplicationsWidget";
import { ActiveJobsWidget } from "../components/widgets/ActiveJobsWidget";
import { UpcomingInterviewsWidget } from "../components/widgets/UpcomingInterviewsWidget";
import { QuickActionsWidget } from "../components/widgets/QuickActionsWidget";

/**
 * CareerDashboardPage
 *
 * Follows the same 2-pane architecture as CampusDashboardPage:
 *   sidebar + full-width content (no separate right panel).
 *
 * Layout:
 *   1. WelcomeBanner        — full width
 *   2. MetricsSummaryWidget — 4-col stat row
 *   3. 3-col widget grid    — RecentApplications | ActiveJobs | UpcomingInterviews
 *   4. QuickActionsWidget   — full width (inner 4-col grid)
 *
 * This matches CampusDashboardPage's pattern exactly and gives every widget
 * a correct width budget — no cramping from a competing right panel.
 */
export function CareerDashboardPage() {
  return (
    <div className="flex-1 min-w-0 space-y-6">
      {/* Welcome header */}
      <WelcomeBanner />

      {/* 4-col stat row */}
      <MetricsSummaryWidget />

      {/* 3-col widget grid — matches Campus pattern */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <RecentApplicationsWidget />
        <ActiveJobsWidget />
        <UpcomingInterviewsWidget />
      </div>

      {/* Full-width quick actions bar */}
      <QuickActionsWidget />
    </div>
  );
}

export default CareerDashboardPage;
