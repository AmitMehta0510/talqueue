import { ReactNode, useEffect } from "react";
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
import { RecruiterDrivePage } from "./pages/RecruiterDrivePage";
import { AdminPage } from "./pages/AdminPage";
import { CompanyAdminPage } from "./pages/CompanyAdminPage";
import { EventsPage } from "./pages/EventsPage";
import { PlacementDashboardPage } from "./pages/PlacementDashboardPage";
import { BusinessOnboardingPage } from "./pages/BusinessOnboardingPage";
import { TpoDashboardPage } from "./pages/TpoDashboardPage";
import { InterviewsPage } from "./pages/InterviewsPage";
import { SearchResultsPage } from "./pages/SearchResultsPage";


/** Syncs dark/light class to <html> based on OS preference. */
function DarkModeSync() {
  useEffect(() => {
    const apply = (dark: boolean) => {
      document.documentElement.classList.toggle("dark", dark);
    };

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return null;
}

/** Wraps page content in an animation key so the fade-in fires on each route change. */
function PageTransitionWrapper({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}

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

  const isPlatformAdmin =
    user?.roles?.some((ur: any) => ur.role?.name === "PLATFORM_ADMIN" || ur.role?.name === "SUPER_ADMIN") ||
    user?.primaryRole === "SUPER_ADMIN";

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
              <PageTransitionWrapper>
                <AuthPage />
              </PageTransitionWrapper>
            </PublicOnly>
          }
        />
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/feed" replace />} />
          <Route path="/feed" element={<PageTransitionWrapper><FeedPage /></PageTransitionWrapper>} />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <PageTransitionWrapper><ProfilePage /></PageTransitionWrapper>
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
          <Route path="/discover" element={<PageTransitionWrapper><DiscoverPage /></PageTransitionWrapper>} />
          <Route path="/search" element={<PageTransitionWrapper><SearchResultsPage /></PageTransitionWrapper>} />
          <Route path="/colleges" element={<PageTransitionWrapper><CollegesPage /></PageTransitionWrapper>} />
          <Route path="/colleges/:collegeSlug" element={<PageTransitionWrapper><CollegesPage /></PageTransitionWrapper>} />
          <Route path="/companies" element={<PageTransitionWrapper><CompaniesPage /></PageTransitionWrapper>} />
          <Route path="/companies/:companySlug" element={<PageTransitionWrapper><CompaniesPage /></PageTransitionWrapper>} />
          <Route path="/communities" element={<PageTransitionWrapper><CommunitiesPage /></PageTransitionWrapper>} />
          <Route
            path="/communities/:communitySlug"
            element={
              <RequireAuth>
                <PageTransitionWrapper><CommunitiesPage /></PageTransitionWrapper>
              </RequireAuth>
            }
          />
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
          <Route path="/projects" element={<PageTransitionWrapper><ProjectsPage /></PageTransitionWrapper>} />
          <Route path="/projects/:projectSlug" element={<PageTransitionWrapper><ProjectsPage /></PageTransitionWrapper>} />
          <Route
            path="/teams"
            element={
              <RequireAuth>
                <PageTransitionWrapper><TeamsPage /></PageTransitionWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/teams/:teamId"
            element={
              <RequireAuth>
                <PageTransitionWrapper><TeamsPage /></PageTransitionWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/social"
            element={
              <RequireAuth>
                <PageTransitionWrapper><SocialPage /></PageTransitionWrapper>
              </RequireAuth>
            }
          />
          <Route path="/hackathons" element={<PageTransitionWrapper><HackathonsPage /></PageTransitionWrapper>} />
          <Route path="/hackathons/:hackathonSlug" element={<PageTransitionWrapper><HackathonsPage /></PageTransitionWrapper>} />
          <Route path="/jobs" element={<PageTransitionWrapper><JobsPage /></PageTransitionWrapper>} />
          <Route path="/interviews" element={<PageTransitionWrapper><InterviewsPage /></PageTransitionWrapper>} />
          <Route
            path="/placements"
            element={
              <RequireAuth>
                <PageTransitionWrapper><PlacementDashboardPage /></PageTransitionWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/events"
            element={
              <RequireAuth>
                <PageTransitionWrapper><EventsPage /></PageTransitionWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/notifications"
            element={
              <RequireAuth>
                <PageTransitionWrapper><NotificationsPage /></PageTransitionWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/referrals"
            element={
              <RequireAuth>
                <PageTransitionWrapper><ReferralsPage /></PageTransitionWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/reputation"
            element={
              <RequireAuth>
                <PageTransitionWrapper><ReputationPage /></PageTransitionWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/recruiter"
            element={
              <RequireAuth>
                <PageTransitionWrapper><RecruiterPage /></PageTransitionWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/recruiter/drive/:driveId"
            element={
              <RequireAuth>
                <PageTransitionWrapper><RecruiterDrivePage /></PageTransitionWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/tpo-dashboard"
            element={
              <RequireAuth>
                <PageTransitionWrapper><TpoDashboardPage /></PageTransitionWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/business"
            element={
              <RequireAuth>
                <PageTransitionWrapper><BusinessOnboardingPage /></PageTransitionWrapper>
              </RequireAuth>
            }
          />

          <Route
            path="/companies/:companySlug/admin"
            element={
              <RequireAuth>
                <PageTransitionWrapper><CompanyAdminPage /></PageTransitionWrapper>
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequirePlatformAdmin>
                <PageTransitionWrapper><AdminPage /></PageTransitionWrapper>
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
      <DarkModeSync />
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
