import {
  LayoutDashboard,
  Home,
  Search,
  Handshake,
  BriefcaseBusiness,
  Calendar,
  Rocket,
  Globe,
  Users,
  GraduationCap,
  Building2,
  MonitorPlay,
  Award,
  Gavel,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { User } from "../../lib/api";
import { isPlatformAdmin, isRecruiter, isTpo } from "../../core/utils/roles";

export type NavSection = {
  to: string;
  label: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
};

// CAMPUS CONFIGURATIONS
export const campusPinnedSections: NavSection[] = [
  { to: "/campus",             label: "Dashboard",        icon: LayoutDashboard },
  { to: "/campus/feed",        label: "Feed",             icon: Home },
  { to: "/campus/discover",    label: "Discover",         icon: Search },
  { to: "/campus/projects",    label: "Projects",         icon: Rocket },
  { to: "/campus/hackathons",  label: "Hackathons",       icon: Gavel },
  { to: "/campus/placements",  label: "Placement Drives", icon: Calendar,          requiresAuth: true },
];

export const campusDropdownSections: NavSection[] = [
  { to: "/campus/communities", label: "Communities",icon: Globe },
  { to: "/campus/teams",         label: "Teams",      icon: Users,         requiresAuth: true },
  { to: "/campus/colleges",      label: "Colleges",   icon: GraduationCap },
  { to: "/campus/events",        label: "Events",     icon: Calendar },
  { to: "/campus/tpo-dashboard", label: "TPO Portal", icon: BriefcaseBusiness, requiresAuth: true },
  { to: "/campus/admin",         label: "Admin Panel",icon: Gavel,         requiresAuth: true },
  { to: "/campus/profile",       label: "Profile",    icon: UserRound,     requiresAuth: true },
];

export const campusBottomTabs: NavSection[] = [
  { to: "/campus/feed",        label: "Feed",       icon: Home },
  { to: "/campus/projects",    label: "Projects",   icon: Rocket },
  { to: "/campus",             label: "Dashboard",  icon: LayoutDashboard },
  { to: "/campus/communities", label: "Spaces",     icon: Globe },
  { to: "/campus/profile",     label: "Me",         icon: UserRound,     requiresAuth: true },
];

// CAREER CONFIGURATIONS
export const careerPinnedSections: NavSection[] = [
  { to: "/career",             label: "Dashboard",  icon: LayoutDashboard },
  { to: "/career/jobs",        label: "Jobs",       icon: BriefcaseBusiness },
  { to: "/career/companies",   label: "Companies",  icon: Building2 },
  { to: "/career/referrals",   label: "Referrals",  icon: Handshake,         requiresAuth: true },
  { to: "/career/interviews",  label: "Interviews", icon: MonitorPlay },
];

export const careerDropdownSections: NavSection[] = [
  { to: "/career/recruiter",   label: "Recruiting", icon: BriefcaseBusiness, requiresAuth: true },
  { to: "/career/profile",     label: "Profile",    icon: UserRound,         requiresAuth: true },
  { to: "/career/reputation",  label: "Reputation", icon: Award,             requiresAuth: true },
];

export const careerBottomTabs: NavSection[] = [
  { to: "/career/jobs",        label: "Jobs",       icon: BriefcaseBusiness },
  { to: "/career",             label: "Dashboard",  icon: LayoutDashboard },
  { to: "/career/interviews",  label: "Interviews", icon: MonitorPlay },
  { to: "/career/profile",     label: "Me",         icon: UserRound,         requiresAuth: true },
];

/**
 * Navigation builder function. Filters navigation nodes based on user roles and workspace.
 */
export function getWorkspaceNavigation(workspace: "CAMPUS" | "CAREER", user: User | null) {
  if (workspace === "CAMPUS") {
    const pinned = campusPinnedSections;
    const dropdown = campusDropdownSections.filter((s) => {
      if (s.to === "/campus/tpo-dashboard" && (!user || !isTpo(user))) return false;
      if (s.to === "/campus/admin" && (!user || !isPlatformAdmin(user))) return false;
      return true;
    });
    const bottom = campusBottomTabs;
    return { pinned, dropdown, bottom };
  } else {
    const pinned = careerPinnedSections.filter((s) => {
      if (s.to.startsWith("/career/recruiter") && (!user || !isRecruiter(user))) return false;
      return true;
    });
    const dropdown = careerDropdownSections.filter((s) => {
      if (s.to.startsWith("/career/recruiter") && (!user || !isRecruiter(user))) return false;
      return true;
    });
    const bottom = careerBottomTabs;
    return { pinned, dropdown, bottom };
  }
}
