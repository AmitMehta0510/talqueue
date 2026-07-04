import { useAuth } from "../core/contexts/AuthContext";
import { WorkspaceShell } from "./WorkspaceShell";
import { getWorkspaceNavigation } from "./config/navigation";
import { CampusSidebar } from "../components/sidebar/CampusSidebar";

export function CampusLayout() {
  const { user } = useAuth();
  const { pinned, dropdown, bottom } = getWorkspaceNavigation("CAMPUS", user);

  return (
    <WorkspaceShell
      workspaceTitle="Campus Workspace"
      pinnedSections={pinned}
      dropdownSections={dropdown}
      bottomTabs={bottom}
      sidebar={<CampusSidebar />}
    />
  );
}
