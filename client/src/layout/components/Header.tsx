import { useState, useRef, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { Search, Menu, X, Briefcase, type LucideIcon } from "lucide-react";
import { User } from "../../lib/api";
import { LogoSection } from "./LogoSection";
import { NotificationArea } from "./NotificationArea";
import { UserMenu } from "./UserMenu";
import { isPlatformAdmin } from "../../core/utils/roles";

type NavSection = {
  to: string;
  label: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
};

type HeaderProps = {
  /** Current authenticated user */
  user: User | null;
  /** Logout handler */
  logout: () => Promise<void>;
  /** API health check status boolean */
  apiOnline: boolean | null;
  /** API health status string representation */
  apiStatus: string;
  /** Sections pinned to the desktop top navigation bar */
  pinnedSections?: NavSection[];
  /** Sections sorted inside the "More" overflow dropdown */
  sortedDropdownSections?: NavSection[];
  /** Callback triggered when search query is submitted */
  onSearch?: (query: string) => void;
  /** Custom logo trigger */
  showWorkspaceContext?: boolean;
  /** Selected Workspace context indicator title label */
  workspaceTitle?: string;
  /** Switch context action trigger */
  onSwitchWorkspace?: () => void;
};

const glassStyle: React.CSSProperties = {
  background: "var(--glass-bg)",
  borderColor: "var(--border)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
};

/**
 * Sticky Header layout component. Includes logo, search input, top navigation,
 * notification indicators, and user dropdown triggers.
 */
export function Header({
  user,
  logout,
  apiOnline,
  apiStatus,
  pinnedSections = [],
  sortedDropdownSections = [],
  onSearch,
  showWorkspaceContext = false,
  workspaceTitle = "",
  onSwitchWorkspace,
}: HeaderProps) {
  const navigate = useNavigate();
  const isUserAdmin = isPlatformAdmin(user);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  // Close overlays on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (value: string) => {
    if (onSearch) {
      onSearch(value);
    } else {
      navigate(`/search?q=${encodeURIComponent(value)}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b" style={glassStyle}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Logo & Search OR Workspace Title */}
        <div className="flex items-center gap-3 flex-1 md:flex-initial">
          {showWorkspaceContext ? (
            <div className="flex items-center gap-3">
              <LogoSection />
              <div className="h-6 w-px bg-base" style={{ background: "var(--border)" }} />
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
                  {workspaceTitle}
                </span>
                {onSwitchWorkspace && (
                  <button
                    onClick={onSwitchWorkspace}
                    type="button"
                    className="text-[9px] uppercase font-bold px-2 py-0.5 border rounded hover:bg-surface-3 transition-colors"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                  >
                    Switch
                  </button>
                )}
              </div>
            </div>
          ) : (
            <LogoSection />
          )}

          {/* Global Search */}
          <div className="relative hidden md:block w-64 max-w-xs ml-2">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              size={15}
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="text"
              className="field pl-9 py-1.5 text-xs"
              style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)" }}
              placeholder="Search engineers, skills, jobs..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) handleSearchSubmit(val);
                }
              }}
            />
          </div>
        </div>

        {/* Center: Desktop Navigation links (Only if pinnedSections exists) */}
        {pinnedSections.length > 0 && (
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 h-full">
            {pinnedSections.map((section) => {
              const Icon = section.icon;
              const locked = section.requiresAuth && !user;

              return (
                <NavLink
                  key={section.to}
                  to={locked ? "/auth" : section.to}
                  state={locked ? { from: { pathname: section.to } } : undefined}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center gap-1 px-3 h-full text-[10px] font-bold tracking-wide transition-all duration-150 border-b-2 uppercase leading-none ${
                      isActive
                        ? "border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-400"
                        : "border-transparent hover:border-[color:var(--border-strong)]"
                    }`
                  }
                  style={({ isActive }) => ({
                    color: isActive ? undefined : "var(--text-muted)",
                  })}
                >
                  <Icon size={19} className="stroke-[2px]" />
                  <span className="mt-1">{section.label}</span>
                </NavLink>
              );
            })}

            {/* "More" overflow dropdown */}
            {sortedDropdownSections.length > 0 && (
              <div className="relative h-full flex items-center" ref={moreDropdownRef}>
                <button
                  onClick={() => setMoreMenuOpen((o) => !o)}
                  type="button"
                  className={`flex flex-col items-center justify-center gap-1 px-3.5 h-full text-[10px] font-bold tracking-wide transition-all duration-150 border-b-2 uppercase leading-none focus:outline-none ${
                    moreMenuOpen
                      ? "border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-400"
                      : "border-transparent"
                  }`}
                  style={{ color: moreMenuOpen ? undefined : "var(--text-muted)" }}
                >
                  <Menu size={19} className="stroke-[2px]" />
                  <span className="mt-1">More</span>
                </button>

                {moreMenuOpen && (
                  <div className="glass absolute right-0 top-full mt-2 w-56 p-2 z-50 animate-scale-in">
                    <div className="space-y-0.5 text-xs font-semibold">
                      {sortedDropdownSections.map((section) => {
                        const Icon = section.icon;
                        const locked = section.requiresAuth && !user;

                        return (
                          <NavLink
                            key={section.to}
                            to={locked ? "/auth" : section.to}
                            state={locked ? { from: { pathname: section.to } } : undefined}
                            className={({ isActive }) =>
                              `flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 ${
                                isActive ? "text-indigo-700 dark:text-indigo-400 font-bold" : ""
                              }`
                            }
                            style={({ isActive }) => ({
                              color: isActive ? undefined : "var(--text-secondary)",
                            })}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-surface-2)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                          >
                            <Icon size={16} />
                            <span>{section.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* API Health indicator for administrators */}
          {isUserAdmin && (
            <div
              className="hidden xl:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xxs font-medium border"
              style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${apiOnline ? "bg-indigo-500" : "bg-rose-500 animate-ping"}`} />
              <span>{apiStatus === "checking" ? "Ping…" : apiOnline ? "API OK" : "API Offline"}</span>
            </div>
          )}

          {/* Business Button */}
          <Link
            to="/business"
            className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 hover:scale-105 border"
            style={{
              background: "linear-gradient(135deg, var(--brand-light), rgba(99,102,241,0.15))",
              borderColor: "rgba(99,102,241,0.3)",
              color: "var(--brand)",
            }}
            title="Business — Register your company or college"
          >
            <Briefcase size={14} className="shrink-0" />
            <span>Business</span>
          </Link>

          {/* Notifications area */}
          <NotificationArea user={user} />

          {/* Profile User Menu Trigger */}
          <div className="hidden lg:block">
            <UserMenu user={user} logout={logout} />
          </div>

          {/* Mobile menu hamburger button */}
          <button
            onClick={() => setMobileMenuOpen((o) => !o)}
            type="button"
            title="Toggle Menu"
            className="lg:hidden icon-btn rounded-full"
          >
            {mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer panel overlay */}
      {mobileMenuOpen && sortedDropdownSections.length > 0 && (
        <div
          className="lg:hidden border-t px-4 py-4 space-y-2.5 max-h-[70vh] overflow-y-auto animate-fade-up"
          style={glassStyle}
        >
          {/* Mobile search */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              size={15}
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="text"
              className="field pl-9 py-1.5 text-xs"
              placeholder="Search engineers, skills..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) handleSearchSubmit(val);
                }
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-bold py-2 border-b" style={{ borderColor: "var(--border)" }}>
            {sortedDropdownSections.map((section) => {
              const Icon = section.icon;
              const locked = section.requiresAuth && !user;
              return (
                <NavLink
                  key={section.to}
                  to={locked ? "/auth" : section.to}
                  state={locked ? { from: { pathname: section.to } } : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-2 p-2.5 rounded-lg border transition-all duration-150 ${
                      isActive
                        ? "border-indigo-500/40 text-indigo-700 dark:text-indigo-400 font-extrabold"
                        : ""
                    }`
                  }
                  style={({ isActive }) => ({
                    background: isActive ? "var(--brand-light)" : "var(--bg-surface-2)",
                    borderColor: isActive ? undefined : "var(--border)",
                    color: isActive ? undefined : "var(--text-secondary)",
                  })}
                >
                  <Icon size={16} />
                  <span>{section.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
