import { useState, useRef, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { Search, Menu, X, Briefcase, Sun, Moon, type LucideIcon } from "lucide-react";
import { useDarkMode } from "../../core/contexts/DarkModeContext";
import type { NavSection } from "../config/navigation";
import { User } from "../../lib/api";
import { LogoSection } from "./LogoSection";
import { NotificationArea } from "./NotificationArea";
import { ChatIconButton } from "./ChatIconButton";
import { UserMenu } from "./UserMenu";
import { isPlatformAdmin } from "../../core/utils/roles";


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
  showChatIcon = false,
}: HeaderProps) {
  const navigate = useNavigate();
  const isUserAdmin = isPlatformAdmin(user);
  const { isDark, toggle: toggleDark } = useDarkMode();

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
        
        {/* Left: Logo */}
        <div className="flex items-center gap-3 md:flex-1">
          <LogoSection />
        </div>

        {/* Center: Global Search */}
        <div className="hidden md:flex justify-center flex-1 max-w-md">
          <div className="relative w-full max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              size={15}
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="text"
              className="field pl-9 py-1.5 text-xs w-full"
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

          {/* Dark / Light mode toggle */}
          <button
            type="button"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleDark}
            className="icon-btn rounded-full transition-all duration-300"
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
  );
}
