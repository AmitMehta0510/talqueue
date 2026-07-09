import { ReactNode, useCallback, useEffect, useState, lazy, Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AppErrorBoundary, PageLoader } from "./components/ui";
import RouteErrorPage from "./components/error/RouteErrorPage";
import { isPlatformAdmin, isRecruiter, isTpo } from "./core/utils/roles";
import { AuthProvider, useAuth } from "./core/contexts/AuthContext";
import { ToastProvider } from "./core/contexts/ToastContext";
import { WorkspaceProvider } from "./core/contexts/WorkspaceProvider";
import { useWorkspace } from "./hooks/useWorkspace";
import { DarkModeContext } from "./core/contexts/DarkModeContext";

import { campusRoutes } from "./routes/campus.routes";
import { careerRoutes } from "./routes/career.routes";
import { sharedRoutes } from "./routes/shared.routes";
import {
  ProjectRedirect,
  CollegeRedirect,
  CollegeBatchRedirect,
  CommunityRedirect,
  TeamRedirect,
  HackathonRedirect,
  CompanyRedirect,
  CompanyAdminRedirect,
  RecruiterDriveRedirect,
  ProfileRedirect,
} from "./routes/redirects";

// ─── Lazy imports (top-level / cross-workspace pages) ─────────────────────────
const WorkspaceSelectorLayout = lazy(() => import("./layout/WorkspaceSelectorLayout").then(m => ({ default: m.WorkspaceSelectorLayout })));
const AuthPage                = lazy(() => import("./pages/AuthPage").then(m => ({ default: m.AuthPage })));
const LandingPage             = lazy(() => import("./pages/LandingPage").then(m => ({ default: m.LandingPage })));
const WorkspaceSelectorPage   = lazy(() => import("./pages/WorkspaceSelectorPage").then(m => ({ default: m.WorkspaceSelectorPage })));
// ─────────────────────────────────────────────────────────────────────────────

const THEME_KEY = "ep-theme";

function DarkModeProvider({ children }: { children: ReactNode }) {
  const getInitial = () => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  };

  const [isDark, setIsDark] = useState(getInitial);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(THEME_KEY)) setIsDark(e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggle = () => setIsDark((d) => !d);

  return (
    <DarkModeContext.Provider value={{ isDark, toggle }}>
      {children}
    </DarkModeContext.Provider>
  );
}

/** Wraps page content so the fade-in animation fires on each route change. */
function PageTransitionWrapper({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <div key={pathname} className="page-enter">{children}</div>;
}

/**
 * Generic route guard. Calls `useAuth()` exactly once, shows a loader
 * while auth resolves, then either renders children or redirects.
 *
 * @param predicate - receives the resolved User; must return true to allow access.
 * @param fallback  - redirect target when the predicate fails.
 */
function Require({
  predicate,
  fallback,
  children,
}: {
  predicate?: (user: NonNullable<ReturnType<typeof useAuth>["user"]>) => boolean;
  fallback?: string;
  children: ReactNode;
}) {
  const { authStatus, user } = useAuth();
  const location = useLocation();

  if (authStatus === "checking") return <PageLoader />;

  if (!user) {
    const to = fallback ?? "/auth";
    const state = to === "/auth" ? { from: location } : undefined;
    return <Navigate to={to} replace state={state} />;
  }

  if (predicate && !predicate(user)) {
    return <Navigate to={fallback ?? "/feed"} replace />;
  }

  return children;
}

/** Convenience alias — auth check only, no role predicate. */
const RequireAuth = ({ children }: { children: ReactNode }) => (
  <Require>{children}</Require>
);

function PublicOnly({ children }: { children: ReactNode }) {
  const { authStatus, user } = useAuth();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: { pathname?: string; search?: string } } | null)
      ?.from || { pathname: "/feed", search: "" };

  if (authStatus === "checking") return <PageLoader />;

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

function WorkspaceRootElement() {
  const { user } = useAuth();
  const { activeWorkspace, rememberWorkspace, hasSelectedThisSession } = useWorkspace();

  if (!user) {
    return (
      <PageTransitionWrapper>
        <LandingPage />
      </PageTransitionWrapper>
    );
  }

  if (rememberWorkspace || hasSelectedThisSession) {
    return <Navigate to={activeWorkspace === "CAMPUS" ? "/campus" : "/career"} replace />;
  }

  return <Navigate to="/workspace-select" replace />;
}

// Shared guard props passed into extracted route trees
const guardProps = { Require, RequireAuth, PageTransitionWrapper } as const;

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <AppErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Auth gateway */}
          <Route
            path="/auth"
            element={
              <PublicOnly>
                <PageTransitionWrapper><AuthPage /></PageTransitionWrapper>
              </PublicOnly>
            }
          />

          {/* Root — auth-aware redirect or LandingPage */}
          <Route path="/" element={<WorkspaceRootElement />} />

          {/* Workspace selector */}
          <Route element={<RequireAuth><WorkspaceSelectorLayout /></RequireAuth>}>
            <Route path="/workspace-select" element={<WorkspaceSelectorPage />} />
          </Route>

          {/* ── Workspace route subtrees (see routes/*.routes.tsx) ── */}
          {campusRoutes(guardProps)}
          {careerRoutes(guardProps)}
          {sharedRoutes(guardProps)}

          {/* ── Legacy flat-URL redirects ── */}
          <Route path="/feed"                         element={<Navigate to="/campus/feed" replace />} />
          <Route path="/campus/discover"              element={<Navigate to="/discover" replace />} />
          <Route path="/projects"                     element={<Navigate to="/campus/projects" replace />} />
          <Route path="/projects/:projectSlug"        element={<ProjectRedirect />} />
          <Route path="/colleges"                     element={<Navigate to="/campus/colleges" replace />} />
          <Route path="/colleges/:collegeSlug"        element={<CollegeRedirect />} />
          <Route path="/colleges/:collegeSlug/batch/:graduationYear" element={<CollegeBatchRedirect />} />
          <Route path="/communities"                  element={<Navigate to="/campus/communities" replace />} />
          <Route path="/communities/:communitySlug"   element={<CommunityRedirect />} />
          <Route path="/teams"                        element={<Navigate to="/campus/teams" replace />} />
          <Route path="/teams/:teamId"                element={<TeamRedirect />} />
          <Route path="/social"                       element={<Navigate to="/campus/social" replace />} />
          <Route path="/hackathons"                   element={<Navigate to="/campus/hackathons" replace />} />
          <Route path="/hackathons/:hackathonSlug"    element={<HackathonRedirect />} />
          <Route path="/events"                       element={<Navigate to="/campus/events" replace />} />
          <Route path="/tpo-dashboard"                element={<Navigate to="/campus/tpo-dashboard" replace />} />
          <Route path="/admin"                        element={<Navigate to="/campus/admin" replace />} />
          <Route path="/profile"                      element={<RequireAuth><ProfileRedirect /></RequireAuth>} />
          <Route path="/jobs"                         element={<Navigate to="/career/jobs" replace />} />
          <Route path="/companies"                    element={<Navigate to="/career/companies" replace />} />
          <Route path="/companies/:companySlug"       element={<CompanyRedirect />} />
          <Route path="/companies/:companySlug/admin" element={<CompanyAdminRedirect />} />
          <Route path="/interviews"                   element={<Navigate to="/career/interviews" replace />} />
          <Route path="/placements"                   element={<Navigate to="/campus/placements" replace />} />
          <Route path="/reputation"                   element={<Navigate to="/career/reputation" replace />} />
          <Route path="/recruiter"                    element={<Navigate to="/career/recruiter" replace />} />
          <Route path="/recruiter/drive/:driveId"     element={<RecruiterDriveRedirect />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DarkModeProvider>
        <ToastProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <AppRoutes />
            </WorkspaceProvider>
          </AuthProvider>
        </ToastProvider>
      </DarkModeProvider>
    </BrowserRouter>
  );
}
