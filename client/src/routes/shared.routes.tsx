/**
 * Shared platform route tree (routes accessible from both workspaces).
 *
 * Extracted from App.tsx to keep it scannable.
 * Import SharedRoutes into App.tsx and render inside <Routes>.
 */
import { lazy } from "react";
import { Route } from "react-router-dom";

import RouteErrorPage from "../components/error/RouteErrorPage";
import { BusinessOnboardingRedirect } from "./redirects";

// ─── Lazy page imports (shared) ───────────────────────────────────────────────
const SharedLayout          = lazy(() => import("../layout/SharedLayout").then(m => ({ default: m.SharedLayout })));
const ChatPage              = lazy(() => import("../pages/ChatPage").then(m => ({ default: m.ChatPage })));
const SearchResultsPage     = lazy(() => import("../pages/SearchResultsPage").then(m => ({ default: m.SearchResultsPage })));
const DiscoverPage          = lazy(() => import("../pages/DiscoverPage").then(m => ({ default: m.DiscoverPage })));
const NotificationsPage     = lazy(() => import("../pages/NotificationsPage").then(m => ({ default: m.NotificationsPage })));
const UserProfilePage       = lazy(() => import("../pages/UserProfilePage").then(m => ({ default: m.UserProfilePage })));
const OrganizationSelectorPage = lazy(() => import("../pages/OrganizationSelectorPage").then(m => ({ default: m.OrganizationSelectorPage })));
// ─────────────────────────────────────────────────────────────────────────────

type GuardComponents = {
  RequireAuth: React.ComponentType<{ children: React.ReactNode }>;
  PageTransitionWrapper: React.ComponentType<{ children: React.ReactNode }>;
};

export function sharedRoutes({ RequireAuth, PageTransitionWrapper }: GuardComponents) {
  return (
    <Route element={<SharedLayout />} errorElement={<RouteErrorPage />}>
      <Route
        path="/chat"
        element={
          <RequireAuth>
            <PageTransitionWrapper><ChatPage /></PageTransitionWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="/chat/:conversationId"
        element={
          <RequireAuth>
            <PageTransitionWrapper><ChatPage /></PageTransitionWrapper>
          </RequireAuth>
        }
      />
      <Route path="/search" element={<PageTransitionWrapper><SearchResultsPage /></PageTransitionWrapper>} />
      {/* Discover is shared — accessible from both Campus and Career workspaces */}
      <Route path="/discover" element={<PageTransitionWrapper><DiscoverPage /></PageTransitionWrapper>} />
      <Route
        path="/notifications"
        element={
          <RequireAuth>
            <PageTransitionWrapper><NotificationsPage /></PageTransitionWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="/users/:username"
        element={
          <RequireAuth>
            <PageTransitionWrapper><UserProfilePage /></PageTransitionWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="/business"
        element={
          <RequireAuth>
            <PageTransitionWrapper><OrganizationSelectorPage /></PageTransitionWrapper>
          </RequireAuth>
        }
      />
      {/* Legacy: /business-onboarding → /business */}
      <Route path="/business-onboarding" element={<BusinessOnboardingRedirect />} />
    </Route>
  );
}
