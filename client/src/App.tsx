import { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PageLoader } from "./components/ui";
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

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
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
          path="/users/:userId"
          element={
            <RequireAuth>
              <UserProfilePage />
            </RequireAuth>
          }
        />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/colleges" element={<CollegesPage />} />
        <Route path="/colleges/:collegeId" element={<CollegesPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/companies/:companySlug" element={<CompaniesPage />} />
        <Route path="/communities" element={<CommunitiesPage />} />
        <Route path="/communities/:communitySlug" element={<CommunitiesPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:conversationId" element={<ChatPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectsPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/teams/:teamId" element={<TeamsPage />} />
        <Route path="/social" element={<SocialPage />} />
        <Route path="/hackathons" element={<HackathonsPage />} />
        <Route path="/hackathons/:hackathonId" element={<HackathonsPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route
          path="/notifications"
          element={
            <RequireAuth>
              <NotificationsPage />
            </RequireAuth>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/feed" replace />} />
    </Routes>
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
