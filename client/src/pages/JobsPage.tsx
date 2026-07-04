import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../core/contexts/AuthContext";
import { JobsPageContent } from "../components/jobs/JobsPageContent";

export function JobsPage() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <JobsPageContent />;
}
export default JobsPage;
