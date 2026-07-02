import { useWorkspace } from "../hooks/useWorkspace";
import { CampusLayout } from "./CampusLayout";
import { CareerLayout } from "./CareerLayout";

export function SharedLayout() {
  const { activeWorkspace } = useWorkspace();

  if (activeWorkspace === "CAMPUS") {
    return <CampusLayout />;
  } else {
    return <CareerLayout />;
  }
}
