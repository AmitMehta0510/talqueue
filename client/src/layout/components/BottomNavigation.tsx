import { NavLink } from "react-router-dom";
import { type LucideIcon } from "lucide-react";
import { User } from "../../lib/api";

export type TabSection = {
  to: string;
  label: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
};

type BottomNavigationProps = {
  /** The navigation tab items to display */
  tabs: TabSection[];
  /** Current authenticated user, or null if guest */
  user: User | null;
};

/**
 * Mobile-viewport fixed bottom tab navigation bar.
 */
export function BottomNavigation({ tabs, user }: BottomNavigationProps) {
  return (
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
        {tabs.map((tab) => {
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
  );
}
