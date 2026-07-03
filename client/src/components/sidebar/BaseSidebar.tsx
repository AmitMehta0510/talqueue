import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LucideIcon, ChevronLeft, ChevronRight, RefreshCw, LogOut } from "lucide-react";
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

  return (
    <aside
      className={`hidden lg:flex lg:flex-col border-r h-[calc(100vh-4rem)] sticky top-16 shrink-0 transition-all duration-300 select-none bg-[color:var(--bg-surface)] border-[color:var(--border)]`}
      style={{ width: isCollapsed ? "4.5rem" : "16rem" }}
    >
      {/* Workspace Context Switcher Header */}
      <div className="p-4 border-b border-[color:var(--border)] flex flex-col gap-2">
        {isCollapsed ? (
          <button
            onClick={onSwitchWorkspace}
            title={`Switch to ${activeWorkspace === "CAMPUS" ? "Career" : "Campus"}`}
            className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl bg-brand-light text-brand hover:scale-105 transition-all duration-200"
          >
            <RefreshCw size={18} className="hover:rotate-180 transition-transform duration-500 ease-out" />
          </button>
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest font-black text-brand">
                Workspace
              </span>
              <button
                onClick={onSwitchWorkspace}
                className="text-[10px] text-muted hover:text-brand transition-colors duration-200 flex items-center gap-1 font-bold"
              >
                <RefreshCw size={10} />
                Switch
              </button>
            </div>
            <div className="flex items-center justify-between bg-surface-2 p-2.5 rounded-xl border border-[color:var(--border)]">
              <span className="text-sm font-black text-primary truncate mr-1">
                {workspaceTitle}
              </span>
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 flex-shrink-0 shadow-sm" />
            </div>
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
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 hover-lift ${
                  isActive
                    ? "bg-[color:var(--brand-light)] text-[color:var(--brand)] font-bold shadow-sm"
                    : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-surface-3)]"
                } ${isCollapsed ? "justify-center" : ""}`
              }
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

      {/* Footer Area with Collapse Toggle and User Info */}
      <div className="p-3 border-t border-[color:var(--border)] space-y-3 bg-surface-2/30">
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

        {/* Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center py-2 text-xs text-muted hover:text-primary transition-colors border border-[color:var(--border)] rounded-xl bg-surface-2 hover:bg-surface-3"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
