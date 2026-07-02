import { ReactNode, useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { AppErrorBoundary, PageLoader } from "./components/ui";
import { isPlatformAdmin, isRecruiter, isTpo } from "./core/utils/roles";
import { AuthProvider, useAuth } from "./core/contexts/AuthContext";
import { ToastProvider } from "./core/contexts/ToastContext";
import { WorkspaceProvider } from "./core/contexts/WorkspaceProvider";
import { CampusLayout } from "./layout/CampusLayout";
import { CareerLayout } from "./layout/CareerLayout";
import { SharedLayout } from "./layout/SharedLayout";
import { WorkspaceSelectorLayout } from "./layout/WorkspaceSelectorLayout";
import { useWorkspace } from "./hooks/useWorkspace";

const AuthPage = lazy(() => import("./pages/AuthPage").then(m => ({ default: m.AuthPage })));
const ChatPage = lazy(() => import("./pages/ChatPage").then(m => ({ default: m.ChatPage })));
const CollegesPage = lazy(() => import("./pages/CollegesPage").then(m => ({ default: m.CollegesPage })));
const CommunitiesPage = lazy(() => import("./pages/CommunitiesPage").then(m => ({ default: m.CommunitiesPage })));
const CompaniesPage = lazy(() => import("./pages/CompaniesPage").then(m => ({ default: m.CompaniesPage })));
const DiscoverPage = lazy(() => import("./pages/DiscoverPage").then(m => ({ default: m.DiscoverPage })));
const FeedPage = lazy(() => import("./pages/FeedPage").then(m => ({ default: m.FeedPage })));
const HackathonsPage = lazy(() => import("./pages/HackathonsPage").then(m => ({ default: m.HackathonsPage })));
const JobsPage = lazy(() => import("./pages/JobsPage").then(m => ({ default: m.JobsPage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then(m => ({ default: m.NotificationsPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then(m => ({ default: m.ProfilePage })));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage").then(m => ({ default: m.ProjectsPage })));
const SocialPage = lazy(() => import("./pages/SocialPage").then(m => ({ default: m.SocialPage })));
const TeamsPage = lazy(() => import("./pages/TeamsPage").then(m => ({ default: m.TeamsPage })));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage").then(m => ({ default: m.UserProfilePage })));
const ReferralsPage = lazy(() => import("./pages/ReferralsPage").then(m => ({ default: m.ReferralsPage })));
const ReputationPage = lazy(() => import("./pages/ReputationPage").then(m => ({ default: m.ReputationPage })));
const RecruiterPage = lazy(() => import("./pages/RecruiterPage").then(m => ({ default: m.RecruiterPage })));
const RecruiterDrivePage = lazy(() => import("./pages/RecruiterDrivePage").then(m => ({ default: m.RecruiterDrivePage })));
const AdminPage = lazy(() => import("./pages/AdminPage").then(m => ({ default: m.AdminPage })));
const CompanyAdminPage = lazy(() => import("./pages/CompanyAdminPage").then(m => ({ default: m.CompanyAdminPage })));
const EventsPage = lazy(() => import("./pages/EventsPage").then(m => ({ default: m.EventsPage })));
const PlacementDashboardPage = lazy(() => import("./pages/PlacementDashboardPage").then(m => ({ default: m.PlacementDashboardPage })));
const OrganizationSelectorPage = lazy(() => import("./pages/OrganizationSelectorPage").then(m => ({ default: m.OrganizationSelectorPage })));
const InstitutionOnboardingPage = lazy(() => import("./pages/InstitutionOnboardingPage").then(m => ({ default: m.InstitutionOnboardingPage })));
const CompanyOnboardingPage = lazy(() => import("./pages/CompanyOnboardingPage").then(m => ({ default: m.CompanyOnboardingPage })));
const TpoDashboardPage = lazy(() => import("./pages/TpoDashboardPage").then(m => ({ default: m.TpoDashboardPage })));
const PublicBatchPage = lazy(() => import("./pages/PublicBatchPage").then(m => ({ default: m.PublicBatchPage })));
const InterviewsPage = lazy(() => import("./pages/InterviewsPage").then(m => ({ default: m.InterviewsPage })));
const SearchResultsPage = lazy(() => import("./pages/SearchResultsPage").then(m => ({ default: m.SearchResultsPage })));
const WorkspaceSelectorPage = lazy(() => import("./pages/WorkspaceSelectorPage").then(m => ({ default: m.WorkspaceSelectorPage })));


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

  if (authStatus === "checking") {
    return <PageLoader />;
  }

  if (!user || !isPlatformAdmin(user)) {
    return <Navigate to="/feed" replace />;
  }

  return children;
}

function RequireRecruiter({ children }: { children: ReactNode }) {
  const { authStatus, user } = useAuth();

  if (authStatus === "checking") {
    return <PageLoader />;
  }

  if (!user || !isRecruiter(user)) {
    return <Navigate to="/feed" replace />;
  }

  return children;
}

function RequireTpo({ children }: { children: ReactNode }) {
  const { authStatus, user } = useAuth();

  if (authStatus === "checking") {
    return <PageLoader />;
  }

  if (!user || !isTpo(user)) {
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

// Redirect helpers for parameter legacy paths
const ProjectRedirect = () => {
  const { projectSlug } = useParams();
  return <Navigate to={`/campus/projects/${projectSlug || ""}`} replace />;
};

const CollegeRedirect = () => {
  const { collegeSlug } = useParams();
  return <Navigate to={`/campus/colleges/${collegeSlug || ""}`} replace />;
};

const CollegeBatchRedirect = () => {
  const { collegeSlug, graduationYear } = useParams();
  return <Navigate to={`/campus/colleges/${collegeSlug || ""}/batch/${graduationYear || ""}`} replace />;
};

const CommunityRedirect = () => {
  const { communitySlug } = useParams();
  return <Navigate to={`/campus/communities/${communitySlug || ""}`} replace />;
};

const TeamRedirect = () => {
  const { teamId } = useParams();
  return <Navigate to={`/campus/teams/${teamId || ""}`} replace />;
};

const HackathonRedirect = () => {
  const { hackathonSlug } = useParams();
  return <Navigate to={`/campus/hackathons/${hackathonSlug || ""}`} replace />;
};

const CompanyRedirect = () => {
  const { companySlug } = useParams();
  return <Navigate to={`/career/companies/${companySlug || ""}`} replace />;
};

const CompanyAdminRedirect = () => {
  const { companySlug } = useParams();
  return <Navigate to={`/career/companies/${companySlug || ""}/admin`} replace />;
};

const RecruiterDriveRedirect = () => {
  const { driveId } = useParams();
  return <Navigate to={`/career/recruiter/drive/${driveId || ""}`} replace />;
};

const ProfileRedirect = () => {
  const { activeWorkspace } = useWorkspace();
  return <Navigate to={activeWorkspace === "CAMPUS" ? "/campus/profile" : "/career/profile"} replace />;
};

// Root route component that redirects to workspace context or shows SelectorPage
function WorkspaceRootElement() {
  const { activeWorkspace, rememberWorkspace, hasSelectedThisSession } = useWorkspace();

  if (rememberWorkspace || hasSelectedThisSession) {
    return <Navigate to={activeWorkspace === "CAMPUS" ? "/campus" : "/career"} replace />;
  }

  return (
    <PageTransitionWrapper>
      <WorkspaceSelectorPage />
    </PageTransitionWrapper>
  );
}

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <AppErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Authentication gateway route */}
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

          {/* Root gate route / selector page */}
          <Route
            element={
              <RequireAuth>
                <WorkspaceSelectorLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<WorkspaceRootElement />} />
          </Route>

          {/* 1. CAMPUS WORKSPACE NESTED TREE */}
          <Route path="/campus" element={<CampusLayout />}>
            <Route index element={<Navigate to="/campus/feed" replace />} />
            <Route path="feed" element={<PageTransitionWrapper><FeedPage /></PageTransitionWrapper>} />
            <Route path="discover" element={<PageTransitionWrapper><DiscoverPage /></PageTransitionWrapper>} />
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
                <RequireAuth>
                  <RequireTpo>
                    <PageTransitionWrapper><TpoDashboardPage /></PageTransitionWrapper>
                  </RequireTpo>
                </RequireAuth>
              }
            />
             <Route
              path="admin"
              element={
                <RequireAuth>
                  <RequirePlatformAdmin>
                    <PageTransitionWrapper><AdminPage /></PageTransitionWrapper>
                  </RequirePlatformAdmin>
                </RequireAuth>
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
          </Route>

          {/* 2. CAREER WORKSPACE NESTED TREE */}
          <Route path="/career" element={<CareerLayout />}>
            <Route index element={<Navigate to="/career/jobs" replace />} />
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
              path="placements"
              element={
                <RequireAuth>
                  <PageTransitionWrapper><PlacementDashboardPage /></PageTransitionWrapper>
                </RequireAuth>
              }
            />
            <Route
              path="recruiter"
              element={
                <RequireAuth>
                  <RequireRecruiter>
                    <PageTransitionWrapper><RecruiterPage /></PageTransitionWrapper>
                  </RequireRecruiter>
                </RequireAuth>
              }
            />
            <Route
              path="recruiter/drive/:driveId"
              element={
                <RequireAuth>
                  <RequireRecruiter>
                    <PageTransitionWrapper><RecruiterDrivePage /></PageTransitionWrapper>
                  </RequireRecruiter>
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
          </Route>

          {/* 3. SHARED PLATFORM GATED TREE */}
          <Route element={<SharedLayout />}>
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
           </Route>

          {/* Legacy flat route redirects */}
          <Route path="/feed" element={<Navigate to="/campus/feed" replace />} />
          <Route path="/discover" element={<Navigate to="/campus/discover" replace />} />
          <Route path="/projects" element={<Navigate to="/campus/projects" replace />} />
          <Route path="/projects/:projectSlug" element={<ProjectRedirect />} />
          <Route path="/colleges" element={<Navigate to="/campus/colleges" replace />} />
          <Route path="/colleges/:collegeSlug" element={<CollegeRedirect />} />
          <Route path="/colleges/:collegeSlug/batch/:graduationYear" element={<CollegeBatchRedirect />} />
          <Route path="/communities" element={<Navigate to="/campus/communities" replace />} />
          <Route path="/communities/:communitySlug" element={<CommunityRedirect />} />
          <Route path="/teams" element={<Navigate to="/campus/teams" replace />} />
          <Route path="/teams/:teamId" element={<TeamRedirect />} />
          <Route path="/social" element={<Navigate to="/campus/social" replace />} />
          <Route path="/hackathons" element={<Navigate to="/campus/hackathons" replace />} />
          <Route path="/hackathons/:hackathonSlug" element={<HackathonRedirect />} />
          <Route path="/events" element={<Navigate to="/campus/events" replace />} />
          <Route path="/tpo-dashboard" element={<Navigate to="/campus/tpo-dashboard" replace />} />
          <Route path="/admin" element={<Navigate to="/campus/admin" replace />} />
          <Route path="/profile" element={<RequireAuth><ProfileRedirect /></RequireAuth>} />

          <Route path="/jobs" element={<Navigate to="/career/jobs" replace />} />
          <Route path="/companies" element={<Navigate to="/career/companies" replace />} />
          <Route path="/companies/:companySlug" element={<CompanyRedirect />} />
          <Route path="/companies/:companySlug/admin" element={<CompanyAdminRedirect />} />
          <Route path="/interviews" element={<Navigate to="/career/interviews" replace />} />
          <Route path="/placements" element={<Navigate to="/career/placements" replace />} />
          <Route path="/reputation" element={<Navigate to="/career/reputation" replace />} />
          <Route path="/recruiter" element={<Navigate to="/career/recruiter" replace />} />
          <Route path="/recruiter/drive/:driveId" element={<RecruiterDriveRedirect />} />

          {/* Catch-all wildcards */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DarkModeSync />
      <ToastProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <AppRoutes />
          </WorkspaceProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

