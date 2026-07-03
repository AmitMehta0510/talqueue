import { WelcomeBanner } from "../components/widgets/WelcomeBanner";
import { MiniProfileWidget } from "../components/widgets/MiniProfileWidget";
import { MetricsSummaryWidget } from "../components/widgets/MetricsSummaryWidget";
import { RecentApplicationsWidget } from "../components/widgets/RecentApplicationsWidget";
import { ActiveJobsWidget } from "../components/widgets/ActiveJobsWidget";
import { UpcomingInterviewsWidget } from "../components/widgets/UpcomingInterviewsWidget";
import { QuickActionsWidget } from "../components/widgets/QuickActionsWidget";
import { CareerRightPanel } from "../components/panels/CareerRightPanel";

export function CareerDashboardPage() {
  return (
    <div className="flex gap-6 items-start">
      {/* Central main dashboard layout */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Top welcome splash card */}
        <WelcomeBanner />

        {/* 12-column grid configuration */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Dossier profile card */}
          <div className="col-span-12 lg:col-span-3">
            <MiniProfileWidget />
          </div>

          {/* Core metrics and jobs/applications feed */}
          <div className="col-span-12 lg:col-span-9 space-y-6">
            <MetricsSummaryWidget />
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-8">
                <RecentApplicationsWidget />
              </div>
              <div className="col-span-12 lg:col-span-4">
                <ActiveJobsWidget />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet fallback list for right panel widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:hidden">
          <UpcomingInterviewsWidget />
          <QuickActionsWidget />
        </div>
      </div>

      {/* Desktop-only right panels container */}
      <CareerRightPanel />
    </div>
  );
}
export default CareerDashboardPage;
