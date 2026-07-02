import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, LogOut, LogIn } from "lucide-react";
import { User } from "../../lib/api";
import { Avatar } from "../../components/ui";
import { formatCount, userHeadline, userName } from "../../core/utils/format";

type UserMenuProps = {
  /** Authenticated user or null */
  user: User | null;
  /** Logout trigger function */
  logout: () => Promise<void>;
  /** Navigation target after logging out */
  onLogoutSuccess?: () => void;
};

/**
 * Renders the user profile avatar button and standard profile quick-links dropdown menu.
 */
export function UserMenu({ user, logout, onLogoutSuccess }: UserMenuProps) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    if (onLogoutSuccess) {
      onLogoutSuccess();
    }
  };

  if (!user) {
    return (
      <Link className="btn-primary py-1.5 px-4 text-xs shadow-glow-sm font-semibold" to="/auth">
        <LogIn size={14} />
        Login
      </Link>
    );
  }

  return (
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
            {user.companyAdminships?.filter((a) => !a.officeCity).map((adminship) => (
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
            {user.collegeAdminships?.map((adminship) => (
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
            {user.cdcrMemberships?.map((membership) => (
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
            {user.tpoMemberships?.map((membership) => (
              <Link
                key={membership.id}
                to={`/colleges/${membership.college?.normalizedKey || membership.collegeId}`}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-150 font-bold text-indigo-700 dark:text-indigo-400"
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--brand-light)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <ShieldCheck size={13} className="text-indigo-600" />
                {membership.college?.name || "College"} TPO Console
              </Link>
            ))}
            {user.roles?.some((ur) => ur.role?.name === "SUPER_ADMIN") ? (
              <Link
                to="/admin"
                className="block px-2 py-1.5 rounded-lg transition-all duration-150 font-bold text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
              >
                Super Admin Console
              </Link>
            ) : user.roles?.some((ur) => ur.role?.name === "PLATFORM_ADMIN") ? (
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
  );
}
