/**
 * CommandPalette — Global CMD+K / Ctrl+K command palette.
 *
 * Features:
 *  - Keyboard shortcut: Cmd+K (Mac) / Ctrl+K (Windows)
 *  - Quick navigation to all major routes
 *  - Grouped results: Pages, Actions, Recent
 *  - Keyboard navigation (↑ ↓ Enter Esc)
 *  - Glassmorphic dark/light adaptive design
 */
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  ArrowRight,
  Briefcase,
  Code2,
  GraduationCap,
  Home,
  LayoutDashboard,
  Star,
  Trophy,
  Users,
  Zap,
  FileText,
  Building2,
  ChevronRight,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  group: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const GROUPS_ORDER = ["Navigation", "Actions", "Discover"];

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (path: string) => {
      navigate(path);
      onClose();
    },
    [navigate, onClose],
  );

  const ALL_ITEMS: CommandItem[] = [
    // Navigation
    { id: "home", label: "Home Feed", description: "Your personalised engineer feed", group: "Navigation", icon: <Home size={16} />, action: () => go("/"), keywords: "home feed" },
    { id: "explore", label: "Explore", description: "Discover engineers and projects", group: "Navigation", icon: <Search size={16} />, action: () => go("/explore"), keywords: "explore discover" },
    { id: "projects", label: "Projects", description: "Browse open-source and team projects", group: "Navigation", icon: <Code2 size={16} />, action: () => go("/projects"), keywords: "projects code" },
    { id: "jobs", label: "Jobs", description: "Find engineering roles", group: "Navigation", icon: <Briefcase size={16} />, action: () => go("/jobs"), keywords: "jobs careers hiring" },
    { id: "hackathons", label: "Hackathons", description: "Competitions and build events", group: "Navigation", icon: <Trophy size={16} />, action: () => go("/hackathons"), keywords: "hackathon competition" },
    { id: "teams", label: "Teams", description: "Join or create a team", group: "Navigation", icon: <Users size={16} />, action: () => go("/teams"), keywords: "team collaborate" },
    { id: "leaderboard", label: "Leaderboard", description: "Top engineers by score", group: "Navigation", icon: <Star size={16} />, action: () => go("/leaderboard"), keywords: "leaderboard ranking score" },
    { id: "colleges", label: "Colleges", description: "College placement stats and info", group: "Navigation", icon: <GraduationCap size={16} />, action: () => go("/colleges"), keywords: "college university" },
    { id: "companies", label: "Companies", description: "Browse companies and hiring info", group: "Navigation", icon: <Building2 size={16} />, action: () => go("/companies"), keywords: "company employer" },
    { id: "reputation", label: "My Reputation", description: "Your engineering score and badges", group: "Navigation", icon: <Zap size={16} />, action: () => go("/reputation"), keywords: "score reputation level" },
    { id: "profile", label: "My Profile", description: "Edit your public profile", group: "Navigation", icon: <LayoutDashboard size={16} />, action: () => go("/profile"), keywords: "profile edit me" },
    // Actions
    { id: "new-post", label: "Create Post", description: "Share knowledge or updates", group: "Actions", icon: <FileText size={16} />, action: () => go("/create/post"), keywords: "new post write" },
    { id: "new-project", label: "Add Project", description: "Showcase your project", group: "Actions", icon: <Code2 size={16} />, action: () => go("/create/project"), keywords: "new project add" },
    // Discover
    { id: "search-all", label: "Search Engineers", description: "Full-text search across the platform", group: "Discover", icon: <Search size={16} />, action: () => { go(`/search${query ? `?q=${encodeURIComponent(query)}` : ""}`); }, keywords: "search find engineers" },
    { id: "interviews", label: "Interview Prep", description: "DSA, system design, mock interviews", group: "Discover", icon: <ArrowRight size={16} />, action: () => go("/interviews"), keywords: "interview prep dsa" },
  ];

  const filtered = query.trim()
    ? ALL_ITEMS.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.keywords?.toLowerCase().includes(q)
        );
      })
    : ALL_ITEMS;

  const grouped = GROUPS_ORDER.reduce<Record<string, CommandItem[]>>(
    (acc, group) => {
      const items = filtered.filter((i) => i.group === group);
      if (items.length) acc[group] = items;
      return acc;
    },
    {},
  );

  const flatFiltered = Object.values(grouped).flat();

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flatFiltered[activeIndex]) {
          flatFiltered[activeIndex].action();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [flatFiltered, activeIndex, onClose],
  );

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "15vh",
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 0, 0, 0.55)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "70vh",
          margin: "0 16px",
          borderRadius: "16px",
          overflow: "hidden",
          background: "var(--glass-bg, rgba(18,18,32,0.92))",
          border: "1px solid var(--border, rgba(255,255,255,0.1))",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.15)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 18px",
            borderBottom: "1px solid var(--border, rgba(255,255,255,0.08))",
          }}
        >
          <Search size={18} style={{ color: "var(--brand, #6366f1)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            id="command-palette-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions, or commands…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: "15px",
              color: "var(--text-primary, #e2e8f0)",
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <kbd
              style={{
                padding: "2px 6px",
                fontSize: "11px",
                background: "var(--bg-surface-2, rgba(255,255,255,0.05))",
                border: "1px solid var(--border, rgba(255,255,255,0.1))",
                borderRadius: "4px",
                color: "var(--text-muted, #888)",
              }}
            >
              ESC
            </kbd>
            <button
              onClick={onClose}
              style={{
                padding: "4px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted, #888)",
                display: "flex",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
          {flatFiltered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "32px 16px",
                color: "var(--text-muted, #888)",
                fontSize: "14px",
              }}
            >
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <div
                  style={{
                    padding: "8px 18px 4px",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-muted, #888)",
                  }}
                >
                  {group}
                </div>
                {items.map((item) => {
                  const currentIndex = flatIndex++;
                  const isActive = currentIndex === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.action}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        width: "100%",
                        padding: "10px 18px",
                        textAlign: "left",
                        cursor: "pointer",
                        border: "none",
                        background: isActive
                          ? "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(99,102,241,0.08))"
                          : "transparent",
                        borderLeft: isActive
                          ? "2px solid var(--brand, #6366f1)"
                          : "2px solid transparent",
                        transition: "all 0.12s ease",
                        color: "inherit",
                      }}
                    >
                      <span
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: isActive
                            ? "rgba(99,102,241,0.2)"
                            : "var(--bg-surface-2, rgba(255,255,255,0.05))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          color: isActive ? "var(--brand, #6366f1)" : "var(--text-muted, #888)",
                          transition: "all 0.12s ease",
                        }}
                      >
                        {item.icon}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: "block",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "var(--text-primary, #e2e8f0)",
                            marginBottom: "1px",
                          }}
                        >
                          {item.label}
                        </span>
                        {item.description && (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted, #888)",
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.description}
                          </span>
                        )}
                      </span>
                      {isActive && (
                        <ChevronRight
                          size={14}
                          style={{ color: "var(--brand, #6366f1)", flexShrink: 0 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 18px",
            borderTop: "1px solid var(--border, rgba(255,255,255,0.06))",
            fontSize: "11px",
            color: "var(--text-muted, #888)",
          }}
        >
          <span>
            <kbd
              style={{
                padding: "2px 5px",
                background: "var(--bg-surface-2, rgba(255,255,255,0.05))",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                marginRight: "4px",
              }}
            >
              ↑↓
            </kbd>{" "}
            navigate
          </span>
          <span>
            <kbd
              style={{
                padding: "2px 5px",
                background: "var(--bg-surface-2, rgba(255,255,255,0.05))",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                marginRight: "4px",
              }}
            >
              ↵
            </kbd>{" "}
            open
          </span>
          <span>
            <kbd
              style={{
                padding: "2px 5px",
                background: "var(--bg-surface-2, rgba(255,255,255,0.05))",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                marginRight: "4px",
              }}
            >
              ESC
            </kbd>{" "}
            close
          </span>
        </div>
      </div>
    </div>
  );
}
