import { useState, useRef, useEffect, useCallback } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { Search, Menu, X, Briefcase, Sun, Moon, type LucideIcon, ChevronRight } from "lucide-react";
import { useDarkMode } from "../../core/contexts/DarkModeContext";
import type { NavSection } from "../config/navigation";
import { User } from "../../lib/api";
import { LogoSection } from "./LogoSection";
import { NotificationArea } from "./NotificationArea";
import { ChatIconButton } from "./ChatIconButton";
import { UserMenu } from "./UserMenu";
import { isPlatformAdmin } from "../../core/utils/roles";
import { CommandPalette } from "./CommandPalette";


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
  /** Show chat icon button (workspace layouts only) */
  showChatIcon?: boolean;
};

const glassStyle: React.CSSProperties = {
  background: "var(--glass-bg)",
  borderColor: "var(--border)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
};

/**
 * Sticky Header layout component. Includes logo, CMD+K search trigger, top navigation,
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
  showChatIcon = false,
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isUserAdmin = isPlatformAdmin(user);
  const { isDark, toggle: toggleDark } = useDarkMode();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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

  // CMD+K / Ctrl+K global shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchSubmit = (value: string) => {
    if (onSearch) {
      onSearch(value);
    } else {
      navigate(`/search?q=${encodeURIComponent(value)}`);
    }
  };

  const isMac =
    typeof navigator !== "undefined" && /mac/i.test(navigator.platform);

  return (
    <>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* ── Mobile drawer backdrop ── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "var(--bg-overlay)" }}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile slide-in drawer ── */}
      <div
        className="fixed top-0 left-0 z-50 h-full w-72 lg:hidden flex flex-col overflow-y-auto"
        style={{
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border)",
          transform: mobileMenuOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.28s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: mobileMenuOpen ? "4px 0 40px rgba(0,0,0,0.25)" : "none",
        }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 h-16 border-b shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="Forge" className="h-7 w-7" />
            <span className="font-bold text-base tracking-tight" style={{ color: "var(--text-primary)" }}>Forge</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="icon-btn rounded-full"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav sections */}
        <div className="flex-1 py-3 px-3">
          {[...pinnedSections, ...sortedDropdownSections].map((item) => {
            const Icon = item.icon as LucideIcon;
            const locked = item.requiresAuth && !user;
            return (
              <NavLink
                key={item.to}
                to={locked ? "/auth" : item.to}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 mb-0.5"
                style={({ isActive }) => ({
                  background: isActive ? "var(--brand-light)" : "transparent",
                  color: isActive ? "var(--brand)" : "var(--text-secondary)",
                })}
              >
                <Icon size={17} className="shrink-0" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight size={13} style={{ color: "var(--text-muted)" }} />
              </NavLink>
            );
          })}
        </div>

        {/* Drawer footer */}
        <div className="px-4 pb-6 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            onClick={() => { toggleDark(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ color: "var(--text-secondary)" }}
          >
            {isDark
              ? <Sun size={17} className="text-amber-400 shrink-0" />
              : <Moon size={17} className="shrink-0" />}
            <span>{isDark ? "Switch to Light" : "Switch to Dark"}</span>
          </button>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b" style={glassStyle}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Left: Hamburger (mobile) + Logo */}
          <div className="flex items-center gap-2 md:flex-1">
            {/* Hamburger button — mobile only */}
            <button
              type="button"
              className="lg:hidden icon-btn rounded-full"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <LogoSection />
          </div>

          {/* Center: CMD+K Trigger */}
          <div className="hidden md:flex justify-center flex-1 max-w-md">
            <button
              id="command-palette-trigger"
              type="button"
              onClick={() => setPaletteOpen(true)}
              title="Open command palette (Ctrl+K)"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                maxWidth: "320px",
                padding: "7px 14px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--bg-surface-2)",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "13px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,0.5)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 3px rgba(99,102,241,0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              <Search size={14} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: "left" }}>Search engineers, skills, jobs…</span>
              <kbd
                style={{
                  padding: "2px 6px",
                  fontSize: "11px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "5px",
                  fontFamily: "inherit",
                  letterSpacing: "0.02em",
                  color: "var(--text-muted)",
                  flexShrink: 0,
                }}
              >
                {isMac ? "⌘K" : "Ctrl+K"}
              </kbd>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 shrink-0 md:flex-1 md:justify-end">
            
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

            {/* CMD+K mobile trigger */}
            <button
              type="button"
              className="md:hidden icon-btn rounded-full"
              title="Search (Ctrl+K)"
              onClick={() => setPaletteOpen(true)}
            >
              <Search size={16} />
            </button>

            {/* Dark / Light mode toggle — desktop only (drawer handles mobile) */}
            <button
              type="button"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleDark}
              className="hidden md:inline-flex icon-btn rounded-full transition-all duration-300"
            >
              {isDark
                ? <Sun size={16} className="text-amber-400" />
                : <Moon size={16} />}
            </button>

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

            {/* Chat icon — workspace layouts only, authenticated users */}
            {user && showChatIcon && <ChatIconButton />}

            {/* Notifications area */}
            <NotificationArea user={user} />

            {/* Profile User Menu Trigger */}
            <div>
              <UserMenu user={user} logout={logout} />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
