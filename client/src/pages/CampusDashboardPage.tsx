import { WelcomeBanner } from "../components/widgets/WelcomeBanner";
import { MiniProfileWidget } from "../components/widgets/MiniProfileWidget";
import { MetricsSummaryWidget } from "../components/widgets/MetricsSummaryWidget";
import { YourProjectsWidget } from "../components/widgets/YourProjectsWidget";
import { UpcomingEventsWidget } from "../components/widgets/UpcomingEventsWidget";
import { PlacementDrivesWidget } from "../components/widgets/PlacementDrivesWidget";
import { CampusRightPanel } from "../components/panels/CampusRightPanel";

export function CampusDashboardPage() {
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

          {/* Core metrics and projects feed */}
          <div className="col-span-12 lg:col-span-9 space-y-6">
            <MetricsSummaryWidget />
            <YourProjectsWidget />
          </div>
        </div>

        {/* Mobile/Tablet fallback list for right panel widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:hidden">
          <UpcomingEventsWidget />
          <PlacementDrivesWidget />
        </div>
      </div>

      {/* Desktop-only right panels container */}
      <CampusRightPanel />
    </div>
  );
}
export default CampusDashboardPage;
