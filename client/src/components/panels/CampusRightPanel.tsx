import { BaseRightPanel } from "./BaseRightPanel";
import { UpcomingEventsWidget } from "../widgets/UpcomingEventsWidget";
import { PlacementDrivesWidget } from "../widgets/PlacementDrivesWidget";

export function CampusRightPanel() {
  return (
    <BaseRightPanel className="space-y-6">
      <UpcomingEventsWidget />
      <PlacementDrivesWidget />
    </BaseRightPanel>
  );
}
