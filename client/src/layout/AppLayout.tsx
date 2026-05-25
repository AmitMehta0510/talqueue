import {
  Bell,
  BriefcaseBusiness,
  Building2,
  Code2,
  Compass,
  Gavel,
  GraduationCap,
  Hash,
  LogOut,
  Rocket,
  Search,
  Users,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  NotificationBellButton,
  NotificationPreview,
} from "../components/notifications/NotificationCenter";
import { useAuth } from "../contexts/AuthContext";
import { formatCount, userHeadline, userName } from "../lib/format";
import { Avatar, Metric } from "../components/ui";

const sections = [
  { to: "/feed", label: "Feed", icon: Compass },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/discover", label: "Discover", icon: Search },
  { to: "/colleges", label: "Colleges", icon: GraduationCap },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/communities", label: "Communities", icon: Hash },
  { to: "/projects", label: "Projects", icon: Rocket },
  { to: "/teams", label: "Teams", icon: Users },
  { to: "/social", label: "Social", icon: UserRound },
  { to: "/hackathons", label: "Hackathons", icon: Gavel },
  { to: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

export function AppLayout() {
  const { user, apiOnline, logout } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
        <aside className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:block">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-white">
                <Code2 size={21} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-950">Engineering</div>
                <div className="text-xs text-slate-500">Platform</div>
              </div>
            </div>
            <div className="flex items-center gap-2 lg:mt-6">
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full ${
                  apiOnline === null
                    ? "bg-slate-300"
                    : apiOnline
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                }`}
              />
              <span className="hidden text-xs text-slate-500 sm:inline">
                {apiOnline === null ? "Checking API" : apiOnline ? "API online" : "API offline"}
              </span>
            </div>
          </div>

          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:block lg:space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;

              return (
                <NavLink
                  key={section.to}
                  className={({ isActive }) =>
                    `flex min-w-max items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition lg:w-full ${
                      isActive
                        ? "bg-emerald-50 text-emerald-800"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    }`
                  }
                  to={section.to}
                >
                  <Icon size={18} />
                  {section.label}
                </NavLink>
              );
            })}
          </nav>

          {user && (
            <div className="mt-6 hidden rounded-lg border border-slate-200 bg-slate-50 p-4 lg:block">
              <div className="flex items-center gap-3">
                <Avatar user={user} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-950">
                    {userName(user)}
                  </div>
                  <div className="truncate text-xs text-slate-500">@{user.username}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <Metric label="Rep" value={formatCount(user.reputationScore)} />
                <Metric label="Eng" value={Math.round(user.engineeringScore || 0)} />
                <Metric label="Posts" value={formatCount(user.postCount)} />
              </div>
            </div>
          )}

          {user ? (
            <button className="btn-secondary mt-6 hidden w-full lg:flex" type="button" onClick={logout}>
              <LogOut size={16} />
              Logout
            </button>
          ) : (
            <NavLink className="btn-primary mt-6 hidden w-full lg:flex" to="/auth">
              Login
            </NavLink>
          )}
        </aside>

        <div className="min-w-0">
          <header className="sticky top-[65px] z-10 border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur lg:top-0 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-slate-950">Engineering Platform</h2>
                <p className="hidden text-sm text-slate-500 sm:block">
                  {user ? userHeadline(user) || `@${user.username}` : "Public workspace"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    className="icon-btn"
                    type="button"
                    title="Notifications"
                    disabled={!user}
                    onClick={() => setNotificationsOpen((open) => !open)}
                  >
                    {user ? <NotificationBellButton /> : <Bell size={17} />}
                  </button>
                  {user && notificationsOpen && <NotificationPreview />}
                </div>
                {user && (
                  <button className="icon-btn lg:hidden" type="button" title="Logout" onClick={logout}>
                    <LogOut size={17} />
                  </button>
                )}
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
            <Outlet />
          </main>
        </div>
    </div>
  );
}
