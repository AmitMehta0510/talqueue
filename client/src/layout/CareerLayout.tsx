import { useAuth } from "../core/contexts/AuthContext";
import { WorkspaceShell } from "./WorkspaceShell";
import { getWorkspaceNavigation } from "./config/navigation";
import { CareerSidebar } from "../components/sidebar/CareerSidebar";

export function CareerLayout() {
  const { user } = useAuth();
  const { pinned, dropdown, bottom } = getWorkspaceNavigation("CAREER", user);

  return (
    <WorkspaceShell
      workspaceTitle="Career Workspace"
      pinnedSections={pinned}
      dropdownSections={dropdown}
      bottomTabs={bottom}
      sidebar={<CareerSidebar />}
    />
  );
}
