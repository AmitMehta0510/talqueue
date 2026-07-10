/**
 * @file shared/rbac/enforce.ts
 *
 * RBAC Service-Layer Enforcement
 * ─────────────────────────────
 * Guards that throw AppError(403) if the calling user lacks the required permission.
 *
 * Usage (in any service function):
 *
 *   import { requirePermission } from "shared/rbac/enforce";
 *   import { Permission } from "shared/rbac/permissions";
 *
 *   export const banUser = async (actorUser: RBACUser, targetUserId: string) => {
 *     requirePermission(actorUser, Permission.BAN_USER);
 *     // ... business logic
 *   };
 *
 * Why service-layer enforcement?
 *   HTTP middleware (requirePlatformAdmin, etc.) guards routes.
 *   Service-layer enforcement guards the FUNCTION — so if a route is
 *   accidentally exposed or called internally, the permission still holds.
 *   Defense in depth.
 *
 * The `actorUser` shape matches what auth.middleware.ts attaches to `req.user`:
 *   { id, roles: [{ role: { name } }], ... }
 */

import AppError from "shared/errors/AppError";
import { Permission, getUserPermissions } from "./permissions";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal user shape needed for RBAC checks (from req.user). */
export interface RBACUser {
  id:    string;
  roles?: Array<{ role?: { name?: string } }>;
}

// ─── Core guard ───────────────────────────────────────────────────────────────

/**
 * Throws AppError(403) if `user` does not hold `permission`.
 * No-ops if the user has the required permission.
 *
 * @param user       The authenticated user (from req.user or service args)
 * @param permission The Permission enum value to check
 * @param message    Optional custom error message
 *
 * @throws AppError 403 if permission denied
 * @throws AppError 401 if user is null/undefined
 */
export function requirePermission(
  user:       RBACUser | null | undefined,
  permission: Permission,
  message?:   string,
): void {
  if (!user) {
    throw new AppError("Unauthorized — no authenticated user", 401);
  }

  const roleNames = extractRoleNames(user);
  const perms     = getUserPermissions(roleNames);

  if (!perms.has(permission)) {
    throw new AppError(
      message ?? `Access denied — required permission: ${permission}`,
      403,
    );
  }
}

/**
 * Non-throwing variant — returns true if user has the permission.
 * Use when you want conditional behavior rather than throwing.
 */
export function hasPermission(
  user:       RBACUser | null | undefined,
  permission: Permission,
): boolean {
  if (!user) return false;
  const roleNames = extractRoleNames(user);
  return getUserPermissions(roleNames).has(permission);
}

/**
 * Requires ANY of the listed permissions (OR logic).
 * Throws if the user holds none of them.
 */
export function requireAnyPermission(
  user:        RBACUser | null | undefined,
  permissions: Permission[],
  message?:    string,
): void {
  if (!user) {
    throw new AppError("Unauthorized — no authenticated user", 401);
  }

  const roleNames = extractRoleNames(user);
  const perms     = getUserPermissions(roleNames);
  const hasAny    = permissions.some((p) => perms.has(p));

  if (!hasAny) {
    throw new AppError(
      message ?? `Access denied — required one of: ${permissions.join(", ")}`,
      403,
    );
  }
}

/**
 * Requires ALL of the listed permissions (AND logic).
 */
export function requireAllPermissions(
  user:        RBACUser | null | undefined,
  permissions: Permission[],
  message?:    string,
): void {
  if (!user) {
    throw new AppError("Unauthorized — no authenticated user", 401);
  }

  const roleNames = extractRoleNames(user);
  const perms     = getUserPermissions(roleNames);
  const missingPerms = permissions.filter((p) => !perms.has(p));

  if (missingPerms.length) {
    throw new AppError(
      message ?? `Access denied — missing permissions: ${missingPerms.join(", ")}`,
      403,
    );
  }
}

// ─── Private helpers ─────────────────────────────────────────────────────────

function extractRoleNames(user: RBACUser): string[] {
  return (user.roles ?? [])
    .map((ur) => ur?.role?.name)
    .filter((name): name is string => !!name);
}
