import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../core/contexts/AuthContext";
import { ProfileWorkspace } from "../components/profile/ProfileWorkspace";

export function ProfilePage() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <ProfileWorkspace fallbackUser={user} />;
}
export default ProfilePage;
