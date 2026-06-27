import { useEffect, useState, useRef } from "react";
import { NavLink, Outlet, useLocation, Link, useNavigate } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  Code2,
  Gavel,
  Globe,
  GraduationCap,
  Handshake,
  Home,
  LogIn,
  LogOut,
  MonitorPlay,
  ShieldCheck,
  MessageSquare,
  Rocket,
  Search,
  Users,
  Users2,
  UserRound,
  Award,
  Menu,
  X,
  Calendar,
  type LucideIcon,
  Briefcase,
} from "lucide-react";
import {
  NotificationBellButton,
  NotificationPreview,
} from "../components/notifications/NotificationCenter";
import { useAuth } from "../contexts/AuthContext";
import { formatCount, userHeadline, userName } from "../lib/format";
import { Avatar } from "../components/ui";
import { useNotificationSocket } from "../hooks/useNotificationSocket";

type NavSection = {
  to: string;
  label: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
};

const sections: NavSection[] = [
  { to: "/feed",        label: "Home",       icon: Home },
  { to: "/discover",   label: "Discover",   icon: Search },
  { to: "/chat",       label: "Chats",      icon: MessageSquare, requiresAuth: true },
  { to: "/social",     label: "Network",    icon: Users2,        requiresAuth: true },
  { to: "/referrals",  label: "Referrals",  icon: Handshake,     requiresAuth: true },
  { to: "/jobs",       label: "Jobs",       icon: BriefcaseBusiness },
  { to: "/events",     label: "Events",     icon: Calendar },
  { to: "/projects",   label: "Projects",   icon: Rocket },
  { to: "/communities",label: "Communities",icon: Globe },
  { to: "/teams",      label: "Teams",      icon: Users,         requiresAuth: true },
  { to: "/colleges",   label: "Colleges",   icon: GraduationCap },
  { to: "/companies",  label: "Companies",  icon: Building2 },
  { to: "/interviews", label: "Interviews", icon: MonitorPlay },
  { to: "/reputation", label: "Reputation", icon: Award,         requiresAuth: true },
  { to: "/hackathons", label: "Hackathons", icon: Gavel },
  { to: "/recruiter",  label: "Recruiting", icon: BriefcaseBusiness, requiresAuth: true },
];

const pinnedSections: NavSection[] = [
  { to: "/feed",       label: "Home",       icon: Home },
  { to: "/discover",   label: "Discover",   icon: Search },
  { to: "/jobs",       label: "Jobs",       icon: BriefcaseBusiness },
  { to: "/referrals",  label: "Referrals",  icon: Handshake,      requiresAuth: true },
  { to: "/social",     label: "Network",    icon: Users2,         requiresAuth: true },
  { to: "/chat",       label: "Chats",      icon: MessageSquare,  requiresAuth: true },
];

/** Fixed bottom tab bar — 5 key routes shown on mobile (<lg) */
const bottomTabs: NavSection[] = [
  { to: "/feed",       label: "Home",       icon: Home },
  { to: "/discover",   label: "Discover",   icon: Search },
  { to: "/jobs",       label: "Jobs",       icon: BriefcaseBusiness },
  { to: "/chat",       label: "Chat",       icon: MessageSquare, requiresAuth: true },
  { to: "/profile",    label: "Me",         icon: UserRound,     requiresAuth: true },
];

const glassStyle: React.CSSProperties = {
  background: "var(--glass-bg)",
  borderColor: "var(--border)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
};

export function AppLayout() {
  const { user, apiOnline, apiStatus, logout } = useAuth();
  useNotificationSocket();

  const isUserAdmin =
    user &&
    (
      user.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN" || ur.role?.name === "SUPER_ADMIN") ||
      user.primaryRole === "PLATFORM_ADMIN" ||
      user.primaryRole === "SUPER_ADMIN"
    );

  const [mobileMenuOpen,     setMobileMenuOpen]     = useState(false);
  const [profileDropdownOpen,setProfileDropdownOpen] = useState(false);
  const [notificationsOpen,  setNotificationsOpen]   = useState(false);
  const [moreMenuOpen,       setMoreMenuOpen]        = useState(false);

  const location        = useLocation();
  const navigate        = useNavigate();
  const dropdownRef     = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close overlays on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
    setNotificationsOpen(false);
    setMoreMenuOpen(false);
  }, [location.pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node))
        setProfileDropdownOpen(false);
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node))
        setMoreMenuOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node))
        setNotificationsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  const visibleSections = sections.filter((section) => {
    if (section.to === "/recruiter" && user?.primaryRole !== "RECRUITER") return false;
    return true;
  });

  const sortedDropdownSections = visibleSections
    .filter((section) => !pinnedSections.some((p) => p.to === section.to))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-base)" }}>

      {/* ============================================================
          STICKY HEADER — glassmorphism, dark-mode aware
          ============================================================ */}
      <header className="sticky top-0 z-40 border-b" style={glassStyle}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Logo & Search */}
          <div className="flex items-center gap-3 flex-1 md:flex-initial">
            <Link to="/feed" className="flex items-center gap-2 shrink-0">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-700 text-white shadow-glow-sm hover:bg-indigo-600 transition-all duration-200 hover:scale-105">
                <Code2 size={20} />
              </div>
              <div className="hidden sm:block">
                <span className="text-sm font-black tracking-tight block leading-none" style={{ color: "var(--text-primary)" }}>
                  Engineering
                </span>
                <span className="text-[10px] font-bold block mt-0.5 uppercase tracking-wider leading-none" style={{ color: "var(--text-muted)" }}>
                  Hub
                </span>
              </div>
            </Link>

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
                    if (val) navigate(`/search?q=${encodeURIComponent(val)}`);
                  }
                }}
              />
            </div>
          </div>

          {/* Desktop Navigation */}
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
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5 shrink-0">

            {/* API Health pill — admin only */}
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

            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                className="icon-btn rounded-full relative"
                type="button"
                title="Notifications"
                disabled={!user}
                onClick={() => setNotificationsOpen((o) => !o)}
              >
                {user ? <NotificationBellButton /> : <Bell size={16} />}
              </button>
              {user && notificationsOpen && <NotificationPreview />}
            </div>

            {/* Profile / Login */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen((o) => !o)}
                  type="button"
                  title="My Account"
                  className="flex items-center justify-center ring-2 ring-transparent hover:ring-[color:var(--border-strong)] rounded-full transition-all duration-150 focus:outline-none"
                >
                  <Avatar user={user} size="sm" />
                </button>

                {profileDropdownOpen && (
                  <div className="glass absolute right-0 mt-3 w-64 p-4 z-50 animate-scale-in">
                    {/* User info header */}
                    <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
                      <Avatar user={user} size="md" />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm truncate leading-tight" style={{ color: "var(--text-primary)" }}>
                          {userName(user)}
                        </h4>
                        <p className="text-xxs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                          @{user.username}
                        </p>
                        <p className="text-xxs font-semibold truncate mt-1 text-indigo-600 dark:text-indigo-400">
                          {userHeadline(user) || "Developer"}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div
                      className="grid grid-cols-2 gap-2 text-center py-3 border-b text-xxs font-bold uppercase tracking-wider"
                      style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                    >
                      <Link
                        to="/reputation"
                        className="p-1 rounded-lg transition-all duration-150 block"
                        style={{ color: "inherit" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-surface-2)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <span className="block text-xs font-black" style={{ color: "var(--text-primary)" }}>
                          {formatCount(user.reputationScore)}
                        </span>
                        <span>Reputation</span>
                      </Link>
                      <div className="p-1 rounded-lg">
                        <span className="block text-xs font-black" style={{ color: "var(--text-primary)" }}>
                          {Math.round(user.engineeringScore || 0)}
                        </span>
                        <span>Eng Score</span>
                      </div>
                    </div>

                    {/* Quick navigation links */}
                    <div className="space-y-0.5 py-3 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      <Link
                        to="/profile"
                        className="block px-2 py-1.5 rounded-lg transition-all duration-150 hover:text-indigo-700 dark:hover:text-indigo-400"
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand-light)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        {user.primaryRole === "STUDENT"
                          ? "View Student Profile"
                          : user.primaryRole === "RECRUITER"
                          ? "View Recruiter Profile"
                          : user.primaryRole === "PROFESSIONAL" || user.primaryRole === "WORKING_PROFESSIONAL"
                          ? "View Professional Profile"
                          : "View Developer Profile"}
                      </Link>
                      {user.primaryRole === "STUDENT" && (
                        <Link
                          to="/placements"
                          className="block px-2 py-1.5 rounded-lg transition-all duration-150 font-bold text-indigo-700 dark:text-indigo-400"
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand-light)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          Placements Dashboard
                        </Link>
                      )}
                      <Link
                        to="/reputation"
                        className="block px-2 py-1.5 rounded-lg transition-all duration-150 hover:text-indigo-700 dark:hover:text-indigo-400"
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand-light)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        Unlocked Badges Catalog
                      </Link>
                      {user.primaryRole === "RECRUITER" && (
                        <Link
                          to="/recruiter"
                          className="block px-2 py-1.5 rounded-lg transition-all duration-150 font-bold hover:text-indigo-700 dark:hover:text-indigo-400"
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand-light)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          Recruiter Console
                        </Link>
                      )}
                      {user.companyAdminships?.filter((a: any) => !a.officeCity).map((adminship: any) => (
                        <Link
                          key={adminship.id}
                          to={`/companies/${adminship.company?.slug || adminship.companyId}/admin`}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-150 font-bold text-indigo-700 dark:text-indigo-400"
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand-light)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <ShieldCheck size={13} className="text-indigo-600" />
                          {adminship.company?.name || "Company"} Console
                        </Link>
                      ))}
                      {user.collegeAdminships?.map((adminship: any) => (
                        <Link
                          key={adminship.id}
                          to={`/colleges/${adminship.college?.normalizedKey || adminship.collegeId}`}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-150 font-bold text-indigo-700 dark:text-indigo-400"
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand-light)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <ShieldCheck size={13} className="text-indigo-600" />
                          {adminship.college?.name || "College"} Admin Console
                        </Link>
                      ))}
                      {user.cdcrMemberships?.map((membership: any) => (
                        <Link
                          key={membership.id}
                          to={`/colleges/${membership.college?.normalizedKey || membership.collegeId}`}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-150 font-bold text-indigo-700 dark:text-indigo-400"
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand-light)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <ShieldCheck size={13} className="text-indigo-600" />
                          {membership.college?.name || "College"} CDCR Console
                        </Link>
                      ))}
                      {user.roles?.some((ur: any) => ur.role?.name === "SUPER_ADMIN") ? (
                        <Link
                          to="/admin"
                          className="block px-2 py-1.5 rounded-lg transition-all duration-150 font-bold text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                        >
                          Super Admin Console
                        </Link>
                      ) : user.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN") ? (
                        <Link
                          to="/admin"
                          className="block px-2 py-1.5 rounded-lg transition-all duration-150 font-bold text-indigo-700 dark:text-indigo-400"
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand-light)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          Platform Admin Console
                        </Link>
                      ) : null}
                    </div>

                    <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
                      <button
                        onClick={handleLogout}
                        type="button"
                        className="btn-secondary w-full text-xs font-semibold py-1.5 text-rose-600 hover:text-rose-700 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      >
                        <LogOut size={13} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link className="btn-primary py-1.5 px-4 text-xs shadow-glow-sm font-semibold" to="/auth">
                <LogIn size={14} />
                Login
              </Link>
            )}

            {/* Mobile hamburger (overflow menu) */}
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

        {/* Mobile slide-down drawer */}
        {mobileMenuOpen && (
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
                    if (val) navigate(`/search?q=${encodeURIComponent(val)}`);
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

      {/* ============================================================
          MAIN CONTENT — extra bottom padding for mobile tab bar
          ============================================================ */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-6">
        <Outlet />
      </main>

      {/* ============================================================
          MOBILE BOTTOM TAB BAR — fixed, glassmorphism, lg:hidden
          ============================================================ */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t"
        style={{
          background: "var(--glass-bg)",
          borderColor: "var(--border)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div className="flex items-center justify-around h-16 px-1 safe-area-inset-bottom">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            const locked = tab.requiresAuth && !user;
            return (
              <NavLink
                key={tab.to}
                to={locked ? "/auth" : tab.to}
                state={locked ? { from: { pathname: tab.to } } : undefined}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 min-w-0"
              >
                {({ isActive }) => (
                  <>
                    <div
                      className="p-1.5 rounded-xl transition-all duration-200"
                      style={{
                        background: isActive ? "var(--brand-light)" : "transparent",
                        color: isActive ? "var(--brand)" : "var(--text-muted)",
                      }}
                    >
                      <Icon size={20} className="stroke-[2px]" />
                    </div>
                    <span
                      className="text-[9px] font-bold tracking-wide leading-none mt-0.5 truncate w-full text-center"
                      style={{ color: isActive ? "var(--brand)" : "var(--text-muted)" }}
                    >
                      {tab.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
