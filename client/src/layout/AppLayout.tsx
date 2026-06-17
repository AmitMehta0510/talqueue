import { useEffect, useState, useRef } from "react";
import { NavLink, Outlet, useLocation, Link, useNavigate } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  Code2,
  Compass,
  Gavel,
  GraduationCap,
  Hash,
  LogIn,
  LogOut,
  LockKeyhole,
  ShieldCheck,
  MessageSquare,
  Rocket,
  Search,
  Users,
  UserRound,
  Award,
  Send,
  Menu,
  X,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import {
  NotificationBellButton,
  NotificationPreview,
} from "../components/notifications/NotificationCenter";
import { useAuth } from "../contexts/AuthContext";
import { formatCount, userHeadline, userName } from "../lib/format";
import { Avatar, Metric } from "../components/ui";

type NavSection = {
  to: string;
  label: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
};

const sections: NavSection[] = [
  { to: "/feed", label: "Home", icon: Compass },
  { to: "/discover", label: "Discover", icon: Search },
  { to: "/chat", label: "Chats", icon: MessageSquare, requiresAuth: true },
  { to: "/social", label: "My Network", icon: UserRound, requiresAuth: true },
  { to: "/referrals", label: "Referrals", icon: Send, requiresAuth: true },
  { to: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/projects", label: "Projects", icon: Rocket },
  { to: "/communities", label: "Communities", icon: Hash },
  { to: "/teams", label: "Teams", icon: Users, requiresAuth: true },
  { to: "/colleges", label: "Colleges", icon: GraduationCap },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/reputation", label: "Reputation", icon: Award, requiresAuth: true },
  { to: "/hackathons", label: "Hackathons", icon: Gavel },
  { to: "/recruiter", label: "Recruiting", icon: BriefcaseBusiness, requiresAuth: true },
];

export function AppLayout() {
  const { user, apiOnline, apiStatus, logout } = useAuth();

  const isUserAdmin =
    user && (
      user.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN" || ur.role?.name === "SUPER_ADMIN") ||
      user.primaryRole === "PLATFORM_ADMIN" ||
      user.primaryRole === "SUPER_ADMIN"
    );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close overlays on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
    setNotificationsOpen(false);
    setMoreMenuOpen(false);
  }, [location.pathname]);

  // Click outside profile dropdown handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  const visibleSections = sections.filter((section) => {
    if (section.to === "/recruiter" && user?.primaryRole !== "RECRUITER") {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      {/* 1. STICKY TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Logo & Global Search */}
          <div className="flex items-center gap-3 flex-1 md:flex-initial">
            <Link to="/feed" className="flex items-center gap-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 transition">
                <Code2 size={20} />
              </div>
              <div className="hidden sm:block">
                <span className="text-sm font-black text-slate-900 tracking-tight block leading-none">Engineering</span>
                <span className="text-[10px] font-bold text-slate-500 block mt-0.5 uppercase tracking-wider leading-none">Hub</span>
              </div>
            </Link>

            {/* Global Search Bar */}
            <div className="relative hidden md:block w-64 max-w-xs ml-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                className="field pl-9 py-1.5 text-xs bg-slate-100/75 border-transparent focus:bg-white focus:border-emerald-500 transition-all duration-150"
                placeholder="Search engineers, skills, jobs..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    navigate(`/discover?q=${(e.target as HTMLInputElement).value}`);
                  }
                }}
              />
            </div>
          </div>

          {/* Desktop Navigation Items */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 h-full">
            {visibleSections.slice(0, 10).map((section, index) => {
              const Icon = section.icon;
              const locked = section.requiresAuth && !user;

              // Responsive visibility class based on index
              const visibilityClass =
                index >= 6
                  ? "hidden"
                  : index >= 4
                    ? "hidden xl:flex"
                    : "flex";

              return (
                <NavLink
                  key={section.to}
                  className={({ isActive }) =>
                    `${visibilityClass} flex-col items-center justify-center gap-1 px-3 h-full text-[10px] font-bold tracking-wide transition border-b-2 uppercase leading-none ${isActive
                      ? "border-emerald-700 text-emerald-800"
                      : "border-transparent text-slate-500 hover:text-slate-950 hover:border-slate-300"
                    }`
                  }
                  to={locked ? "/auth" : section.to}
                  state={locked ? { from: { pathname: section.to } } : undefined}
                >
                  <Icon size={19} className="stroke-[2px]" />
                  <span className="mt-1">{section.label}</span>
                </NavLink>
              );
            })}

            {/* "More" Dropdown Menu */}
            <div className="relative h-full flex items-center" ref={moreDropdownRef}>
              <button
                onClick={() => setMoreMenuOpen((open) => !open)}
                className={`flex flex-col items-center justify-center gap-1 px-3.5 h-full text-[10px] font-bold tracking-wide transition border-b-2 uppercase leading-none focus:outline-none ${moreMenuOpen
                  ? "border-emerald-700 text-emerald-800"
                  : "border-transparent text-slate-500 hover:text-slate-950 hover:border-slate-300"
                  }`}
                type="button"
              >
                <Menu size={19} className="stroke-[2px]" />
                <span className="mt-1">More</span>
              </button>

              {moreMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 text-slate-950 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="space-y-0.5 text-xs font-semibold">
                    {visibleSections.map((section, index) => {
                      const Icon = section.icon;
                      const locked = section.requiresAuth && !user;

                      // Inverse responsive visibility inside the dropdown
                      const dropdownVisibilityClass =
                        index < 4
                          ? "hidden"
                          : index < 6
                            ? "block xl:hidden"
                            : "block";

                      return (
                        <NavLink
                          key={section.to}
                          className={({ isActive }) =>
                            `${dropdownVisibilityClass} flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${isActive
                              ? "bg-emerald-50 text-emerald-900 font-bold"
                              : "text-slate-650 hover:bg-slate-50 hover:text-slate-950"
                            }`
                          }
                          to={locked ? "/auth" : section.to}
                          state={locked ? { from: { pathname: section.to } } : undefined}
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

          {/* Right Area: Actions, Notification Center, Profile Dropdown */}
          <div className="flex items-center gap-3 shrink-0">
            {/* API Health Monitor widget — only visible to PLATFORM_ADMIN / SUPER_ADMIN */}
            {isUserAdmin && (
              <div className="hidden xl:flex items-center gap-1.5 bg-slate-50 border border-slate-150 rounded-full px-2.5 py-1 text-xxs font-medium text-slate-500">
                <span className={`h-1.5 w-1.5 rounded-full ${apiOnline ? "bg-emerald-500" : "bg-rose-500 animate-ping"}`} />
                <span>{apiStatus === "checking" ? "Ping" : apiOnline ? "API OK" : "API Offline"}</span>
              </div>
            )}

            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                className="icon-btn rounded-full border-slate-100 hover:bg-slate-50 relative"
                type="button"
                title="Notifications"
                disabled={!user}
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                {user ? <NotificationBellButton /> : <Bell size={16} />}
              </button>
              {user && notificationsOpen && <NotificationPreview />}
            </div>

            {/* User Profile / Login Dropdown */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen((open) => !open)}
                  className="flex flex-col items-center justify-center h-full focus:outline-none"
                  type="button"
                  title="My Account"
                >
                  <Avatar user={user} size="sm" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl z-50 text-slate-900 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      <Avatar user={user} size="md" />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-slate-950 truncate leading-tight">
                          {userName(user)}
                        </h4>
                        <p className="text-xxs text-slate-500 truncate mt-0.5">@{user.username}</p>
                        <p className="text-xxs text-emerald-800 font-semibold truncate mt-1">
                          {userHeadline(user) || "Developer"}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-center py-3 border-b border-slate-100 text-xxs font-bold uppercase tracking-wider text-slate-500">
                      <Link to="/reputation" className="hover:bg-slate-50 p-1 rounded transition block">
                        <span className="block text-slate-950 text-xs font-black">{formatCount(user.reputationScore)}</span>
                        <span>Reputation</span>
                      </Link>
                      <div className="p-1 rounded">
                        <span className="block text-slate-950 text-xs font-black">{Math.round(user.engineeringScore || 0)}</span>
                        <span>Eng Score</span>
                      </div>
                    </div>

                    {/* Quick navigation links */}
                    <div className="space-y-1 py-3 text-xs font-semibold text-slate-700">
                      <Link to="/profile" className="block px-2 py-1.5 rounded hover:bg-emerald-50 hover:text-emerald-900 transition">
                        {user.primaryRole === "STUDENT"
                          ? "View Student Profile"
                          : user.primaryRole === "RECRUITER"
                          ? "View Recruiter Profile"
                          : user.primaryRole === "PROFESSIONAL" || user.primaryRole === "WORKING_PROFESSIONAL"
                          ? "View Professional Profile"
                          : "View Developer Profile"}
                      </Link>
                      {user.primaryRole === "STUDENT" && (
                        <Link to="/placements" className="block px-2 py-1.5 rounded hover:bg-emerald-50 hover:text-emerald-900 transition font-bold text-emerald-800">
                          Placements Dashboard
                        </Link>
                      )}
                      <Link to="/referrals" className="block px-2 py-1.5 rounded hover:bg-emerald-50 hover:text-emerald-900 transition">
                        Referrals Dashboard
                      </Link>
                      <Link to="/reputation" className="block px-2 py-1.5 rounded hover:bg-emerald-50 hover:text-emerald-900 transition">
                        Unlocked Badges Catalog
                      </Link>
                      {user.primaryRole === "RECRUITER" && (
                        <Link to="/recruiter" className="block px-2 py-1.5 rounded hover:bg-emerald-50 hover:text-emerald-900 transition font-bold">
                          Recruiter Console
                        </Link>
                      )}
                      {user.companyAdminships?.filter((a: any) => !a.officeCity).map((adminship: any) => (
                        <Link
                          key={adminship.id}
                          to={`/companies/${adminship.company?.slug || adminship.companyId}/admin`}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-emerald-50 hover:text-emerald-900 transition font-bold text-emerald-800"
                        >
                          <ShieldCheck size={13} className="text-emerald-600" />
                          {adminship.company?.name || "Company"} Console
                        </Link>
                      ))}
                      {user.collegeAdminships?.map((adminship: any) => (
                        <Link
                          key={adminship.id}
                          to={`/colleges/${adminship.college?.normalizedKey || adminship.collegeId}`}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-emerald-50 hover:text-emerald-900 transition font-bold text-emerald-800"
                        >
                          <ShieldCheck size={13} className="text-emerald-600" />
                          {adminship.college?.name || "College"} Admin Console
                        </Link>
                      ))}
                      {user.cdcrMemberships?.map((membership: any) => (
                        <Link
                          key={membership.id}
                          to={`/colleges/${membership.college?.normalizedKey || membership.collegeId}`}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-emerald-50 hover:text-emerald-900 transition font-bold text-emerald-800"
                        >
                          <ShieldCheck size={13} className="text-emerald-600" />
                          {membership.college?.name || "College"} CDCR Console
                        </Link>
                      ))}
                      {user.roles?.some((ur: any) => ur.role?.name === "SUPER_ADMIN") ? (
                        <Link to="/admin" className="block px-2 py-1.5 rounded hover:bg-purple-50 hover:text-purple-900 transition font-bold text-purple-800">
                          Super Admin Console
                        </Link>
                      ) : user.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN") ? (
                        <Link to="/admin" className="block px-2 py-1.5 rounded hover:bg-emerald-50 hover:text-emerald-900 transition font-bold text-emerald-800">
                          Platform Admin Console
                        </Link>
                      ) : null}
                    </div>

                    <div className="border-t border-slate-100 pt-3 flex justify-end">
                      <button
                        onClick={handleLogout}
                        className="btn-secondary w-full text-xs font-semibold py-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 hover:border-rose-200"
                        type="button"
                      >
                        <LogOut size={13} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link className="btn-primary py-1.5 px-4 text-xs shadow-sm font-semibold" to="/auth">
                <LogIn size={14} />
                Login
              </Link>
            )}

            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="lg:hidden icon-btn border-slate-150 hover:bg-slate-50 relative rounded-full"
              type="button"
              title="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>

        </div>

        {/* Mobile slide-down navigation drawer overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white/95 px-4 py-4 space-y-2.5 max-h-[70vh] overflow-y-auto shadow-inner animate-in slide-in-from-top-3 duration-200">
            {/* Mobile search bar */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                className="field pl-9 py-1.5 text-xs bg-slate-100"
                placeholder="Search engineers, skills..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    navigate(`/discover?q=${(e.target as HTMLInputElement).value}`);
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold py-2 border-b border-slate-100">
              {visibleSections.map((section) => {
                const Icon = section.icon;
                const locked = section.requiresAuth && !user;

                return (
                  <NavLink
                    key={section.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 p-2.5 rounded-lg border transition ${isActive
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-extrabold"
                        : "border-slate-100 text-slate-600 hover:bg-slate-50"
                      }`
                    }
                    to={locked ? "/auth" : section.to}
                    state={locked ? { from: { pathname: section.to } } : undefined}
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

      {/* 2. MAIN WORKSPACE CONTENT CONTAINER */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
