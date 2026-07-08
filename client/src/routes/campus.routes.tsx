/**
 * Campus workspace route tree (/campus/*).
 *
 * Extracted from App.tsx to keep it scannable.
 * Import CampusRoutes into App.tsx and render inside <Routes>.
 */
import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";

import RouteErrorPage from "../components/error/RouteErrorPage";
import { isPlatformAdmin, isTpo } from "../core/utils/roles";

import {
  ProjectRedirect,
  CollegeRedirect,
  CollegeBatchRedirect,
  CommunityRedirect,
  TeamRedirect,
  HackathonRedirect,
} from "./redirects";

// ─── Lazy page imports (campus-only) ─────────────────────────────────────────
const CampusLayout          = lazy(() => import("../layout/CampusLayout").then(m => ({ default: m.CampusLayout })));
const CampusDashboardPage   = lazy(() => import("../pages/CampusDashboardPage").then(m => ({ default: m.CampusDashboardPage })));
const FeedPage              = lazy(() => import("../pages/FeedPage").then(m => ({ default: m.FeedPage })));
const ProjectsPage          = lazy(() => import("../pages/ProjectsPage").then(m => ({ default: m.ProjectsPage })));
const CollegesPage          = lazy(() => import("../pages/CollegesPage").then(m => ({ default: m.CollegesPage })));
const CommunitiesPage       = lazy(() => import("../pages/CommunitiesPage").then(m => ({ default: m.CommunitiesPage })));
const TeamsPage             = lazy(() => import("../pages/TeamsPage").then(m => ({ default: m.TeamsPage })));
const SocialPage            = lazy(() => import("../pages/SocialPage").then(m => ({ default: m.SocialPage })));
const HackathonsPage        = lazy(() => import("../pages/HackathonsPage").then(m => ({ default: m.HackathonsPage })));
const EventsPage            = lazy(() => import("../pages/EventsPage").then(m => ({ default: m.EventsPage })));
const ProfilePage           = lazy(() => import("../pages/ProfilePage").then(m => ({ default: m.ProfilePage })));
const PublicBatchPage       = lazy(() => import("../pages/PublicBatchPage").then(m => ({ default: m.PublicBatchPage })));
const TpoDashboardPage      = lazy(() => import("../pages/TpoDashboardPage").then(m => ({ default: m.TpoDashboardPage })));
const AdminPage             = lazy(() => import("../pages/AdminPage").then(m => ({ default: m.AdminPage })));
const InstitutionOnboardingPage = lazy(() => import("../pages/InstitutionOnboardingPage").then(m => ({ default: m.InstitutionOnboardingPage })));
const PlacementDashboardPage = lazy(() => import("../pages/PlacementDashboardPage").then(m => ({ default: m.PlacementDashboardPage })));
// ─────────────────────────────────────────────────────────────────────────────

// Imported from App.tsx to avoid circular dep — passed as props instead
type GuardComponents = {
  Require: React.ComponentType<{
    predicate?: (user: any) => boolean;
    fallback?: string;
    children: React.ReactNode;
  }>;
  RequireAuth: React.ComponentType<{ children: React.ReactNode }>;
  PageTransitionWrapper: React.ComponentType<{ children: React.ReactNode }>;
};

export function CampusRoutes({ Require, RequireAuth, PageTransitionWrapper }: GuardComponents) {
  return (
    <Route path="/campus" element={<CampusLayout />} errorElement={<RouteErrorPage />}>
      <Route index element={<PageTransitionWrapper><CampusDashboardPage /></PageTransitionWrapper>} />
      <Route path="feed" element={<PageTransitionWrapper><FeedPage /></PageTransitionWrapper>} />

      <Route path="projects" element={<PageTransitionWrapper><ProjectsPage /></PageTransitionWrapper>} />
      <Route path="projects/:projectSlug" element={<PageTransitionWrapper><ProjectsPage /></PageTransitionWrapper>} />
      <Route path="project/:projectSlug" element={<ProjectRedirect />} />
      <Route path="colleges" element={<PageTransitionWrapper><CollegesPage /></PageTransitionWrapper>} />
      <Route path="colleges/:collegeSlug" element={<PageTransitionWrapper><CollegesPage /></PageTransitionWrapper>} />
      <Route path="colleges/:collegeSlug/batch/:graduationYear" element={<PageTransitionWrapper><PublicBatchPage /></PageTransitionWrapper>} />
      <Route path="communities" element={<PageTransitionWrapper><CommunitiesPage /></PageTransitionWrapper>} />
      <Route
        path="communities/:communitySlug"
        element={
          <RequireAuth>
            <PageTransitionWrapper><CommunitiesPage /></PageTransitionWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="teams"
        element={
          <RequireAuth>
            <PageTransitionWrapper><TeamsPage /></PageTransitionWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="teams/:teamId"
        element={
          <RequireAuth>
            <PageTransitionWrapper><TeamsPage /></PageTransitionWrapper>
          </RequireAuth>
        }
      />
      <Route path="team/:teamId" element={<TeamRedirect />} />
      <Route
        path="social"
        element={
          <RequireAuth>
            <PageTransitionWrapper><SocialPage /></PageTransitionWrapper>
          </RequireAuth>
        }
      />
      <Route path="hackathons" element={<PageTransitionWrapper><HackathonsPage /></PageTransitionWrapper>} />
      <Route path="hackathons/:hackathonSlug" element={<PageTransitionWrapper><HackathonsPage /></PageTransitionWrapper>} />
      <Route path="hackathon/:hackathonSlug" element={<HackathonRedirect />} />
      <Route
        path="events"
        element={
          <RequireAuth>
            <PageTransitionWrapper><EventsPage /></PageTransitionWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="profile"
        element={
          <RequireAuth>
            <PageTransitionWrapper><ProfilePage /></PageTransitionWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="tpo-dashboard"
        element={
          <Require predicate={isTpo}>
            <PageTransitionWrapper><TpoDashboardPage /></PageTransitionWrapper>
          </Require>
        }
      />
      <Route
        path="admin"
        element={
          <Require predicate={isPlatformAdmin}>
            <PageTransitionWrapper><AdminPage /></PageTransitionWrapper>
          </Require>
        }
      />
      <Route
        path="onboarding"
        element={
          <RequireAuth>
            <PageTransitionWrapper><InstitutionOnboardingPage /></PageTransitionWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="placements"
        element={
          <RequireAuth>
            <PageTransitionWrapper><PlacementDashboardPage /></PageTransitionWrapper>
          </RequireAuth>
        }
      />

      {/* Legacy redirects inside /campus */}
      <Route path="college/:collegeSlug" element={<CollegeRedirect />} />
      <Route path="college/:collegeSlug/batch/:graduationYear" element={<CollegeBatchRedirect />} />
      <Route path="community/:communitySlug" element={<CommunityRedirect />} />
    </Route>
  );
}
