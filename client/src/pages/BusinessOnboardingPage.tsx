import { Navigate } from "react-router-dom";

/**
 * @deprecated
 *
 * BusinessOnboardingPage has been replaced by
 * OrganizationSelectorPage as part of the Workspace
 * Architecture Migration.
 *
 * This component exists only for backward compatibility
 * with legacy routes and historical references.
 *
 * It will be removed after the onboarding migration
 * is fully completed.
 */
export function BusinessOnboardingPage() {
  return <Navigate to="/business" replace />;
}
