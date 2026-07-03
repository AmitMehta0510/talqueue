import { BaseRightPanel } from "./BaseRightPanel";
import { UpcomingInterviewsWidget } from "../widgets/UpcomingInterviewsWidget";
import { QuickActionsWidget } from "../widgets/QuickActionsWidget";

export function CareerRightPanel() {
  return (
    <BaseRightPanel className="space-y-6">
      <UpcomingInterviewsWidget />
      <QuickActionsWidget />
    </BaseRightPanel>
  );
}
export default CareerRightPanel;
