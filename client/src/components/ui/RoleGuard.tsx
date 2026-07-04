import React from "react";
import { useAuth } from "../../core/contexts/AuthContext";
import { hasRole, isPlatformAdmin } from "../../core/utils/roles";

export interface RoleGuardProps {
  /** List of role names that are allowed to see the children content. */
  allowedRoles?: string[];
  /** Optional override to allow platform admins/super admins by default. Defaults to true. */
  allowAdminByDefault?: boolean;
  /** Optional custom fallback content to display if role checks fail. */
  fallback?: React.ReactNode;
  /** The content to render if role checks succeed. */
  children: React.ReactNode;
}

/**
 * A highly reusable, declarative RoleGuard component for gating inline JSX content
 * based on user role credentials.
 */
export function RoleGuard({
  allowedRoles = [],
  allowAdminByDefault = true,
  fallback = null,
  children,
}: RoleGuardProps) {
  const { user } = useAuth();

  if (!user) {
    return <>{fallback}</>;
  }

  // Admin override check
  if (allowAdminByDefault && isPlatformAdmin(user)) {
    return <>{children}</>;
  }

  // Check if user has any of the allowed roles
  const hasAccess = allowedRoles.some((role) => hasRole(user, role));

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
