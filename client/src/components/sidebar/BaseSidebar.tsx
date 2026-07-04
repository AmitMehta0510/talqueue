import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LucideIcon, ChevronsLeft, ChevronsRight, RefreshCw, LogOut } from "lucide-react";
import { useAuth } from "../../core/contexts/AuthContext";
import { Avatar } from "../ui";

export type SidebarLink = {
  to: string;
  label: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
};

type BaseSidebarProps = {
  activeWorkspace: "CAMPUS" | "CAREER";
  workspaceTitle: string;
  links: SidebarLink[];
  onSwitchWorkspace: () => void;
};

export function BaseSidebar({
  activeWorkspace,
  workspaceTitle,
  links,
  onSwitchWorkspace,
}: BaseSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const isCareer = activeWorkspace === "CAREER";

  return (
    <aside
      className={`hidden lg:flex lg:flex-col border-r h-[calc(100vh-4rem)] sticky top-16 shrink-0 transition-all duration-300 select-none border-[color:var(--border)]`}
      style={{
        width: isCollapsed ? "4rem" : "14.5rem",
        background: isCareer
          ? "linear-gradient(180deg, #070d19 0%, #050a14 100%)"
          : "linear-gradient(180deg, #0d0f22 0%, #080a16 100%)"
      }}
    >
      {/* Workspace Context Switcher Header */}
      <div className="p-4 border-b border-[color:var(--border)] flex flex-col gap-2">
        {isCollapsed ? (
          <button
            onClick={() => setIsCollapsed(false)}
            title="Expand Sidebar"
            className="flex items-center justify-center h-9 w-9 mx-auto rounded-xl transition-all duration-200 hover:scale-105"
            style={{
              background: isCareer ? "rgba(13, 148, 136, 0.15)" : "rgba(99, 102, 241, 0.15)",
              color: isCareer ? "#14b8a6" : "var(--brand)",
            }}
          >
            <ChevronsRight size={16} />
          </button>
        ) : (
          <div className="flex gap-1.5 items-center w-full">
            {isCareer ? (
              <>
                <button
                  onClick={onSwitchWorkspace}
                  className="flex-1 flex items-center justify-between px-3.5 py-2 rounded-xl transition-all duration-200 font-black hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-md text-sm h-9"
                  style={{
                    background: "linear-gradient(135deg, #0d9488, #0891b2)",
                    color: "#ffffff",
                    boxShadow: "0 4px 12px rgba(13, 148, 136, 0.25)"
                  }}
                >
                  <span>Career</span>
                  <RefreshCw size={14} className="opacity-80" />
                </button>
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-200 hover:bg-surface-3 hover:scale-[1.05] active:scale-[0.95] text-muted hover:text-primary shrink-0 border border-[color:var(--border)] bg-surface-2"
                  title="Collapse Sidebar"
                >
                  <ChevronsLeft size={16} style={{ color: "#14b8a6" }} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onSwitchWorkspace}
                  className="flex-1 flex items-center justify-between px-3.5 py-2 rounded-xl transition-all duration-200 font-black hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-md text-sm h-9"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                    color: "#ffffff",
                    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.25)"
                  }}
                >
                  <span>Campus</span>
                  <RefreshCw size={14} className="opacity-80" />
                </button>
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-200 hover:bg-surface-3 hover:scale-[1.05] active:scale-[0.95] text-muted hover:text-primary shrink-0 border border-[color:var(--border)] bg-surface-2"
                  title="Collapse Sidebar"
                >
                  <ChevronsLeft size={16} style={{ color: "var(--brand)" }} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
        {links.map((link) => {
          const Icon = link.icon;
          const locked = link.requiresAuth && !user;
          const targetPath = locked ? "/auth" : link.to;

          return (
            <NavLink
              key={link.to}
              to={targetPath}
              end={link.to === "/campus" || link.to === "/career"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 hover-lift ${
                  isActive
                    ? "font-bold shadow-sm"
                    : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-surface-3)]"
                } ${isCollapsed ? "justify-center" : ""}`
              }
              style={({ isActive }) => {
                if (!isActive) return {};
                if (isCareer) {
                  return {
                    background: "rgba(13, 148, 136, 0.15)",
                    color: "#14b8a6",
                  };
                } else {
                  return {
                    background: "rgba(99, 102, 241, 0.18)",
                    color: "var(--brand)",
                  };
                }
              }}
              title={isCollapsed ? link.label : undefined}
            >
              <Icon size={18} className="shrink-0 stroke-[2px]" />
              {!isCollapsed && (
                <span className="text-sm tracking-wide truncate">{link.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Area with User Info */}
      <div className="p-3 border-t border-[color:var(--border)] bg-surface-2/30">
        {/* User Card */}
        {user && (
          <div
            className={`flex items-center gap-3 p-1.5 rounded-xl ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <Avatar user={user} size="sm" />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-primary truncate">
                  {user.profile?.fullName || user.username}
                </p>
                <p className="text-[10px] text-muted truncate">
                  {user.roles?.map(r => r.role?.name).filter(Boolean).join(", ") || "User"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
