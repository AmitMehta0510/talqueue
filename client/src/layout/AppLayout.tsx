import {
  Home,
  Search,
  MessageSquare,
  Users2,
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
} from "lucide-react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../core/contexts/AuthContext";
import { Header } from "./components/Header";
import { BottomNavigation } from "./components/BottomNavigation";

const sections = [
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

const pinnedSections = [
  { to: "/feed",       label: "Home",       icon: Home },
  { to: "/discover",   label: "Discover",   icon: Search },
  { to: "/jobs",       label: "Jobs",       icon: BriefcaseBusiness },
  { to: "/referrals",  label: "Referrals",  icon: Handshake,      requiresAuth: true },
  { to: "/social",     label: "Network",    icon: Users2,         requiresAuth: true },
  { to: "/chat",       label: "Chats",      icon: MessageSquare,  requiresAuth: true },
];

const bottomTabs = [
  { to: "/feed",       label: "Home",       icon: Home },
  { to: "/discover",   label: "Discover",   icon: Search },
  { to: "/jobs",       label: "Jobs",       icon: BriefcaseBusiness },
  { to: "/chat",       label: "Chat",       icon: MessageSquare, requiresAuth: true },
  { to: "/profile",    label: "Me",         icon: UserRound,     requiresAuth: true },
];

/**
 * AppLayout acts as the legacy backward-compatible layout wrapper.
 * Refactored in Phase 2 to consume extracted Header and BottomNavigation primitives.
 */
export function AppLayout() {
  const { user, apiOnline, apiStatus, logout } = useAuth();

  const visibleSections = sections.filter((section) => {
    if (section.to === "/recruiter" && user?.primaryRole !== "RECRUITER") return false;
    return true;
  });

  const sortedDropdownSections = visibleSections
    .filter((section) => !pinnedSections.some((p) => p.to === section.to))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-base)" }}>
      {/* Sticky Top Header primitive */}
      <Header
        user={user}
        logout={logout}
        apiOnline={apiOnline}
        apiStatus={apiStatus}
        pinnedSections={pinnedSections}
        sortedDropdownSections={sortedDropdownSections}
      />

      {/* Main Outlet Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-6">
        <Outlet />
      </main>

      {/* Fixed Bottom Mobile Navigation primitive */}
      <BottomNavigation tabs={bottomTabs} user={user} />
    </div>
  );
}
