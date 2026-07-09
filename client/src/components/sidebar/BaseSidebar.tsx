import { useState, useEffect, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { LucideIcon, ChevronsLeft, ChevronsRight, RefreshCw } from "lucide-react";
import { useAuth } from "../../core/contexts/AuthContext";
import { Avatar } from "../ui";

const SIDEBAR_KEY = "forge_sidebar_collapsed";
const COLLAPSE_BREAKPOINT = 1280;

function getInitialCollapsed(): boolean {
  try {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved !== null) return saved === "true";
  } catch {}
  // Auto-collapse on viewports narrower than 1280px (laptops)
  return typeof window !== "undefined" ? window.innerWidth < COLLAPSE_BREAKPOINT : false;
}

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
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsed);
  const { user } = useAuth();

  const isCareer = activeWorkspace === "CAREER";

  /** Explicit user toggle — always persists */
  const collapse = useCallback((val: boolean) => {
    setIsCollapsed(val);
    try { localStorage.setItem(SIDEBAR_KEY, String(val)); } catch {}
  }, []);

  /** Auto-collapse on resize if user hasn't set a preference yet */
  useEffect(() => {
    const onResize = () => {
      try {
        if (localStorage.getItem(SIDEBAR_KEY) === null) {
          setIsCollapsed(window.innerWidth < COLLAPSE_BREAKPOINT);
        }
      } catch {}
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <aside
      className="hidden lg:flex lg:flex-col h-[calc(100vh-4rem)] sticky top-16 shrink-0 transition-all duration-300 select-none"
      style={{
        width: isCollapsed ? "4rem" : "14.5rem",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* ── Workspace Switcher Header ── */}
      <div className="p-4 border-b border-[color:var(--border)] flex flex-col gap-2">
        {isCollapsed ? (
          <button
            onClick={() => collapse(false)}
            title="Expand Sidebar"
            aria-label="Expand sidebar"
            className="flex items-center justify-center h-9 w-9 mx-auto rounded-xl transition-all duration-200 hover:scale-105"
            style={{
              background: isCareer ? "rgba(13,148,136,0.15)" : "var(--brand-light)",
              color: isCareer ? "var(--career-accent, #0d9488)" : "var(--brand)",
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
                  title="Switch workspace"
                  className="flex-1 flex items-center justify-between px-3.5 py-2 rounded-xl transition-all duration-200 font-black hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] text-sm h-9"
                  style={{
                    background: "linear-gradient(135deg, #0d9488, #0891b2)",
                    color: "var(--text-inverse)",
                    boxShadow: "0 4px 12px rgba(13,148,136,0.25)",
                  }}
                >
                  <span>Career</span>
                  <RefreshCw size={14} className="opacity-80" />
                </button>
                <button
                  onClick={() => collapse(true)}
                  title="Collapse Sidebar"
                  aria-label="Collapse sidebar"
                  className="flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] shrink-0 border border-[color:var(--border)]"
                  style={{ background: "var(--bg-surface-2)", color: "var(--career-accent, #0d9488)" }}
                >
                  <ChevronsLeft size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onSwitchWorkspace}
                  title="Switch workspace"
                  className="flex-1 flex items-center justify-between px-3.5 py-2 rounded-xl transition-all duration-200 font-black hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] text-sm h-9"
                  style={{
                    background: "linear-gradient(135deg, var(--brand), #4f46e5)",
                    color: "var(--text-inverse)",
                    boxShadow: "0 4px 12px var(--brand-glow)",
                  }}
                >
                  <span>Campus</span>
                  <RefreshCw size={14} className="opacity-80" />
                </button>
                <button
                  onClick={() => collapse(true)}
                  title="Collapse Sidebar"
                  aria-label="Collapse sidebar"
                  className="flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] shrink-0 border border-[color:var(--border)]"
                  style={{ background: "var(--bg-surface-2)", color: "var(--brand)" }}
                >
                  <ChevronsLeft size={16} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation Links ── */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 no-scrollbar">
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
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive ? "font-bold" : "hover:bg-[color:var(--bg-surface-2)]"
                } ${isCollapsed ? "justify-center" : ""}`
              }
              style={({ isActive }) => {
                if (!isActive) return { color: "var(--text-secondary)" };
                if (isCareer) return { background: "rgba(13,148,136,0.12)", color: "var(--career-accent, #0d9488)" };
                return { background: "var(--brand-light)", color: "var(--brand)" };
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

      {/* ── User Footer ── */}
      <div className="p-3 border-t border-[color:var(--border)]">
        {user && (
          <div className={`flex items-center gap-3 p-1.5 rounded-xl ${isCollapsed ? "justify-center" : ""}`}>
            <Avatar user={user} size="sm" />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                  {user.profile?.fullName || user.username}
                </p>
                <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
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

export default BaseSidebar;
