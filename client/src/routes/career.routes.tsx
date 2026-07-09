/**
 * Career workspace route tree (/career/*).
 *
 * Extracted from App.tsx to keep it scannable.
 * Import CareerRoutes into App.tsx and render inside <Routes>.
 */
import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";

import RouteErrorPage from "../components/error/RouteErrorPage";
import { isRecruiter } from "../core/utils/roles";
import { CompanyRedirect, CompanyAdminRedirect, RecruiterDriveRedirect } from "./redirects";

// ─── Lazy page imports (career-only) ─────────────────────────────────────────
const CareerLayout          = lazy(() => import("../layout/CareerLayout").then(m => ({ default: m.CareerLayout })));
const CareerDashboardPage   = lazy(() => import("../pages/CareerDashboardPage").then(m => ({ default: m.CareerDashboardPage })));
const JobsPage              = lazy(() => import("../pages/JobsPage").then(m => ({ default: m.JobsPage })));
const CompaniesPage         = lazy(() => import("../pages/CompaniesPage").then(m => ({ default: m.CompaniesPage })));
const InterviewsPage        = lazy(() => import("../pages/InterviewsPage").then(m => ({ default: m.InterviewsPage })));
const RecruiterPage         = lazy(() => import("../pages/RecruiterPage").then(m => ({ default: m.RecruiterPage })));
const RecruiterDrivePage    = lazy(() => import("../pages/RecruiterDrivePage").then(m => ({ default: m.RecruiterDrivePage })));
const ProfilePage           = lazy(() => import("../pages/ProfilePage").then(m => ({ default: m.ProfilePage })));
const ReferralsPage         = lazy(() => import("../pages/ReferralsPage").then(m => ({ default: m.ReferralsPage })));
const ReputationPage        = lazy(() => import("../pages/ReputationPage").then(m => ({ default: m.ReputationPage })));
const CompanyAdminPage      = lazy(() => import("../pages/CompanyAdminPage").then(m => ({ default: m.CompanyAdminPage })));
const CompanyOnboardingPage = lazy(() => import("../pages/CompanyOnboardingPage").then(m => ({ default: m.CompanyOnboardingPage })));
// ─────────────────────────────────────────────────────────────────────────────

type GuardComponents = {
  Require: React.ComponentType<{
    predicate?: (user: any) => boolean;
    fallback?: string;
    children: React.ReactNode;
  }>;
  RequireAuth: React.ComponentType<{ children: React.ReactNode }>;
  PageTransitionWrapper: React.ComponentType<{ children: React.ReactNode }>;
};

export function careerRoutes({ Require, RequireAuth, PageTransitionWrapper }: GuardComponents) {
  return (
    <Route path="/career" element={<CareerLayout />} errorElement={<RouteErrorPage />}>
      <Route index element={<PageTransitionWrapper><CareerDashboardPage /></PageTransitionWrapper>} />
      <Route path="jobs" element={<PageTransitionWrapper><JobsPage /></PageTransitionWrapper>} />
      <Route path="job/:jobId" element={<Navigate to="/career/jobs" replace />} />
      <Route path="companies" element={<PageTransitionWrapper><CompaniesPage /></PageTransitionWrapper>} />
      <Route path="companies/:companySlug" element={<PageTransitionWrapper><CompaniesPage /></PageTransitionWrapper>} />
      <Route path="company/:companySlug" element={<CompanyRedirect />} />
      <Route
        path="companies/:companySlug/admin"
        element={
          <RequireAuth>
            <PageTransitionWrapper><CompanyAdminPage /></PageTransitionWrapper>
          </RequireAuth>
        }
      />
      <Route path="interviews" element={<PageTransitionWrapper><InterviewsPage /></PageTransitionWrapper>} />
      <Route
        path="recruiter"
        element={
          <Require predicate={isRecruiter}>
            <PageTransitionWrapper><RecruiterPage /></PageTransitionWrapper>
          </Require>
        }
      />
      <Route
        path="recruiter/drive/:driveId"
        element={
          <Require predicate={isRecruiter}>
            <PageTransitionWrapper><RecruiterDrivePage /></PageTransitionWrapper>
          </Require>
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
        path="referrals"
        element={
          <RequireAuth>
            <PageTransitionWrapper><ReferralsPage /></PageTransitionWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="reputation"
        element={
          <RequireAuth>
            <PageTransitionWrapper><ReputationPage /></PageTransitionWrapper>
          </RequireAuth>
        }
      />
      <Route
        path="onboarding"
        element={
          <RequireAuth>
            <PageTransitionWrapper><CompanyOnboardingPage /></PageTransitionWrapper>
          </RequireAuth>
        }
      />

      {/* Legacy redirects inside /career */}
      <Route path="company-admin/:companySlug" element={<CompanyAdminRedirect />} />
      <Route path="recruiter-drive/:driveId" element={<RecruiterDriveRedirect />} />
    </Route>
  );
}
