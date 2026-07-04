import { useAuth } from "../../core/contexts/AuthContext";
import { useWorkspace } from "../../hooks/useWorkspace";
import { useWorkspaceSwitcher } from "../../hooks/useWorkspaceSwitcher";
import { getWorkspaceNavigation } from "../../layout/config/navigation";
import { BaseSidebar } from "./BaseSidebar";

export function CareerSidebar() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { toggleWorkspace } = useWorkspaceSwitcher();

  const { pinned, dropdown } = getWorkspaceNavigation("CAREER", user);
  const links = [...pinned, ...dropdown];

  return (
    <BaseSidebar
      activeWorkspace="CAREER"
      workspaceTitle="Career Workspace"
      links={links}
      onSwitchWorkspace={toggleWorkspace}
    />
  );
}
export default CareerSidebar;
