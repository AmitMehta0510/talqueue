import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../core/contexts/AuthContext";
import { CompanyAdminPageContent } from "../components/company-admin/CompanyAdminPageContent";

export function CompanyAdminPage() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <CompanyAdminPageContent />;
}
export default CompanyAdminPage;
