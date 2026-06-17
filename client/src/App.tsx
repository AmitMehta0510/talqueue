import { ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AppErrorBoundary, PageLoader } from "./components/ui";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { AppLayout } from "./layout/AppLayout";
import { AuthPage } from "./pages/AuthPage";
import { ChatPage } from "./pages/ChatPage";
import { CollegesPage } from "./pages/CollegesPage";
import { CommunitiesPage } from "./pages/CommunitiesPage";
import { CompaniesPage } from "./pages/CompaniesPage";
import { DiscoverPage } from "./pages/DiscoverPage";
import { FeedPage } from "./pages/FeedPage";
import { HackathonsPage } from "./pages/HackathonsPage";
import { JobsPage } from "./pages/JobsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SocialPage } from "./pages/SocialPage";
import { TeamsPage } from "./pages/TeamsPage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { ReferralsPage } from "./pages/ReferralsPage";
import { ReputationPage } from "./pages/ReputationPage";
import { RecruiterPage } from "./pages/RecruiterPage";
import { AdminPage } from "./pages/AdminPage";
import { CompanyAdminPage } from "./pages/CompanyAdminPage";
import { EventsPage } from "./pages/EventsPage";
import { PlacementDashboardPage } from "./pages/PlacementDashboardPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const { authStatus, user } = useAuth();
  const location = useLocation();

  if (authStatus === "checking") {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return children;
}

function RequirePlatformAdmin({ children }: { children: ReactNode }) {
  const { authStatus, user } = useAuth();
  const location = useLocation();

  if (authStatus === "checking") {
    return <PageLoader />;
  }

  const isPlatformAdmin = user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN");

  if (!user || !isPlatformAdmin) {
    return <Navigate to="/feed" replace />;
  }

  return children;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { authStatus, user } = useAuth();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: { pathname?: string; search?: string } } | null)
      ?.from || { pathname: "/feed", search: "" };

  if (authStatus === "checking") {
    return <PageLoader />;
  }

  if (user) {
    return (
      <Navigate
        to={`${redirectTo.pathname || "/feed"}${redirectTo.search || ""}`}
        replace
      />
    );
  }

  return children;
}

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <AppErrorBoundary>
      <Routes>
        <Route
          path="/auth"
          element={
            <PublicOnly>
              <AuthPage />
            </PublicOnly>
          }
        />
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/feed" replace />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/users/:username"
            element={
              <RequireAuth>
                <UserProfilePage />
              </RequireAuth>
            }
          />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/colleges" element={<CollegesPage />} />
          <Route path="/colleges/:collegeSlug" element={<CollegesPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/companies/:companySlug" element={<CompaniesPage />} />
          <Route path="/communities" element={<CommunitiesPage />} />
          <Route
            path="/communities/:communitySlug"
            element={
              <RequireAuth>
                <CommunitiesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/chat"
            element={
              <RequireAuth>
                <ChatPage />
              </RequireAuth>
            }
          />
          <Route
            path="/chat/:conversationId"
            element={
              <RequireAuth>
                <ChatPage />
              </RequireAuth>
            }
          />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectSlug" element={<ProjectsPage />} />
          <Route
            path="/teams"
            element={
              <RequireAuth>
                <TeamsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/teams/:teamId"
            element={
              <RequireAuth>
                <TeamsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/social"
            element={
              <RequireAuth>
                <SocialPage />
              </RequireAuth>
            }
          />
          <Route path="/hackathons" element={<HackathonsPage />} />
          <Route path="/hackathons/:hackathonSlug" element={<HackathonsPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route
            path="/placements"
            element={
              <RequireAuth>
                <PlacementDashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/events"
            element={
              <RequireAuth>
                <EventsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/notifications"
            element={
              <RequireAuth>
                <NotificationsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/referrals"
            element={
              <RequireAuth>
                <ReferralsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/reputation"
            element={
              <RequireAuth>
                <ReputationPage />
              </RequireAuth>
            }
          />
          <Route
            path="/recruiter"
            element={
              <RequireAuth>
                <RecruiterPage />
              </RequireAuth>
            }
          />
          <Route
            path="/companies/:companySlug/admin"
            element={
              <RequireAuth>
                <CompanyAdminPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequirePlatformAdmin>
                <AdminPage />
              </RequirePlatformAdmin>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Routes>
    </AppErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
