import { useAuth } from "../../core/contexts/AuthContext";
import { useWorkspace } from "../../hooks/useWorkspace";
import { useWorkspaceSwitcher } from "../../hooks/useWorkspaceSwitcher";
import { getWorkspaceNavigation } from "../../layout/config/navigation";
import { BaseSidebar } from "./BaseSidebar";

export function CampusSidebar() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { toggleWorkspace } = useWorkspaceSwitcher();

  const { pinned, dropdown } = getWorkspaceNavigation("CAMPUS", user);
  const links = [...pinned, ...dropdown];

  return (
    <BaseSidebar
      activeWorkspace={activeWorkspace}
      workspaceTitle="Campus Workspace"
      links={links}
      onSwitchWorkspace={toggleWorkspace}
    />
  );
}
