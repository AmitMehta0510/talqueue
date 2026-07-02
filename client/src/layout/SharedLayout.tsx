import { useAuth } from "../core/contexts/AuthContext";
import { useWorkspace } from "../hooks/useWorkspace";
import { WorkspaceShell } from "./WorkspaceShell";
import { getWorkspaceNavigation } from "./config/navigation";

export function SharedLayout() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const { pinned, dropdown, bottom } = getWorkspaceNavigation(activeWorkspace, user);

  return (
    <WorkspaceShell
      workspaceTitle={activeWorkspace === "CAMPUS" ? "Campus Workspace" : "Career Workspace"}
      pinnedSections={pinned}
      dropdownSections={dropdown}
      bottomTabs={bottom}
    />
  );
}
