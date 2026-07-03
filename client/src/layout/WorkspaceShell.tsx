import { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../core/contexts/AuthContext";
import { useWorkspaceSwitcher } from "../hooks/useWorkspaceSwitcher";
import { Header } from "./components/Header";
import { BottomNavigation } from "./components/BottomNavigation";
import { NavSection } from "./config/navigation";

type WorkspaceShellProps = {
  workspaceTitle: string;
  pinnedSections: NavSection[];
  dropdownSections: NavSection[];
  bottomTabs: NavSection[];
  sidebar?: ReactNode;
};

/**
 * Reusable layout shell. Responsible for composing top bar Header,
 * mobile BottomNavigation, and wrapping page outlets in the main container.
 */
export function WorkspaceShell({
  workspaceTitle,
  pinnedSections,
  dropdownSections,
  bottomTabs,
  sidebar,
}: WorkspaceShellProps) {
  const { user, apiOnline, apiStatus, logout } = useAuth();
  const { toggleWorkspace } = useWorkspaceSwitcher();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-base)" }}>
      {/* Sticky top primary navigation header */}
      <Header
        user={user}
        logout={logout}
        apiOnline={apiOnline}
        apiStatus={apiStatus}
        pinnedSections={pinnedSections}
        sortedDropdownSections={dropdownSections}
        showWorkspaceContext={true}
        workspaceTitle={workspaceTitle}
        onSwitchWorkspace={toggleWorkspace}
      />

      {/* Sidebar + content area flex wrapper */}
      <div className="flex-1 w-full max-w-7xl mx-auto flex">
        {sidebar}
        {/* Primary content area */}
        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Fixed bottom navigation for mobile screen layouts */}
      <BottomNavigation tabs={bottomTabs} user={user} />
    </div>
  );
}
