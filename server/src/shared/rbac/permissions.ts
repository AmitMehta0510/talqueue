/**
 * @file shared/rbac/permissions.ts
 *
 * Permission Definitions
 * ───────────────────────
 * Defines all permissions in the platform as a typed enum.
 * Maps platform roles (from the Role table) to the permissions they hold.
 *
 * Design:
 *   - ROLE_PERMISSIONS is the single source of truth
 *   - Service functions call requirePermission(user, Permission.X) at the top
 *   - The check is synchronous (uses req.user roles loaded by auth middleware)
 *   - Roles come from User.roles → Role.name in the DB
 *
 * Roles currently in use:
 *   SUPER_ADMIN       — full access, can do anything
 *   PLATFORM_ADMIN    — content moderation, user management
 *   COLLEGE_ADMIN     — manage their college's data
 *   COMPANY_ADMIN     — manage their company's jobs and profiles
 *   TPO               — placement drives, drive invites
 *   CDCR              — referral coordination
 *   USER              — standard authenticated user (default)
 */

export enum Permission {
  // ── User management ─────────────────────────────────────────────────────────
  BAN_USER           = "BAN_USER",
  UNBAN_USER         = "UNBAN_USER",
  VIEW_ANY_USER      = "VIEW_ANY_USER",
  IMPERSONATE_USER   = "IMPERSONATE_USER",
  DELETE_ANY_USER    = "DELETE_ANY_USER",

  // ── Content moderation ────────────────────────────────────────────────────────
  DELETE_ANY_POST    = "DELETE_ANY_POST",
  DELETE_ANY_COMMENT = "DELETE_ANY_COMMENT",
  ARCHIVE_ANY_POST   = "ARCHIVE_ANY_POST",
  FLAG_CONTENT       = "FLAG_CONTENT",
  UNFLAG_CONTENT     = "UNFLAG_CONTENT",

  // ── Jobs moderation ──────────────────────────────────────────────────────────
  DELETE_ANY_JOB     = "DELETE_ANY_JOB",
  APPROVE_JOB        = "APPROVE_JOB",
  REJECT_JOB         = "REJECT_JOB",
  EDIT_ANY_JOB       = "EDIT_ANY_JOB",

  // ── Hackathon management ─────────────────────────────────────────────────────
  DELETE_ANY_HACKATHON  = "DELETE_ANY_HACKATHON",
  FEATURE_HACKATHON     = "FEATURE_HACKATHON",

  // ── Project management ───────────────────────────────────────────────────────
  DELETE_ANY_PROJECT = "DELETE_ANY_PROJECT",

  // ── College management ───────────────────────────────────────────────────────
  MANAGE_COLLEGE_ADMIN = "MANAGE_COLLEGE_ADMIN",
  EDIT_COLLEGE         = "EDIT_COLLEGE",
  CREATE_COLLEGE       = "CREATE_COLLEGE",

  // ── Company management ───────────────────────────────────────────────────────
  MANAGE_COMPANY_ADMIN = "MANAGE_COMPANY_ADMIN",
  EDIT_COMPANY         = "EDIT_COMPANY",
  VERIFY_COMPANY       = "VERIFY_COMPANY",

  // ── Analytics / admin dashboard ──────────────────────────────────────────────
  VIEW_ANALYTICS       = "VIEW_ANALYTICS",
  VIEW_ADMIN_DASHBOARD = "VIEW_ADMIN_DASHBOARD",
  EXPORT_DATA          = "EXPORT_DATA",

  // ── Skills management ─────────────────────────────────────────────────────────
  VERIFY_SKILL         = "VERIFY_SKILL",
  CREATE_SKILL         = "CREATE_SKILL",
  DELETE_SKILL         = "DELETE_SKILL",

  // ── Reputation management ────────────────────────────────────────────────────
  GRANT_REPUTATION     = "GRANT_REPUTATION",
  REVOKE_REPUTATION    = "REVOKE_REPUTATION",

  // ── Placement drives (TPO) ───────────────────────────────────────────────────
  MANAGE_PLACEMENT_DRIVES  = "MANAGE_PLACEMENT_DRIVES",
  SEND_DRIVE_INVITES       = "SEND_DRIVE_INVITES",
  VIEW_STUDENT_ANALYTICS   = "VIEW_STUDENT_ANALYTICS",

  // ── CDCR ─────────────────────────────────────────────────────────────────────
  MANAGE_REFERRALS     = "MANAGE_REFERRALS",
  VIEW_REFERRAL_BOARD  = "VIEW_REFERRAL_BOARD",

  // ── Notifications ───────────────────────────────────────────────────────────
  SEND_MASS_NOTIFICATION = "SEND_MASS_NOTIFICATION",
}

// ─── Role → Permission map ────────────────────────────────────────────────────

const ALL_PERMISSIONS = Object.values(Permission);

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,

  PLATFORM_ADMIN: [
    Permission.BAN_USER,
    Permission.UNBAN_USER,
    Permission.VIEW_ANY_USER,
    Permission.DELETE_ANY_POST,
    Permission.DELETE_ANY_COMMENT,
    Permission.ARCHIVE_ANY_POST,
    Permission.FLAG_CONTENT,
    Permission.UNFLAG_CONTENT,
    Permission.DELETE_ANY_JOB,
    Permission.APPROVE_JOB,
    Permission.REJECT_JOB,
    Permission.EDIT_ANY_JOB,
    Permission.DELETE_ANY_HACKATHON,
    Permission.FEATURE_HACKATHON,
    Permission.DELETE_ANY_PROJECT,
    Permission.MANAGE_COLLEGE_ADMIN,
    Permission.EDIT_COLLEGE,
    Permission.CREATE_COLLEGE,
    Permission.MANAGE_COMPANY_ADMIN,
    Permission.EDIT_COMPANY,
    Permission.VERIFY_COMPANY,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_ADMIN_DASHBOARD,
    Permission.EXPORT_DATA,
    Permission.VERIFY_SKILL,
    Permission.CREATE_SKILL,
    Permission.DELETE_SKILL,
    Permission.GRANT_REPUTATION,
    Permission.REVOKE_REPUTATION,
    Permission.SEND_MASS_NOTIFICATION,
  ],

  COLLEGE_ADMIN: [
    Permission.EDIT_COLLEGE,
    Permission.MANAGE_PLACEMENT_DRIVES,
    Permission.SEND_DRIVE_INVITES,
    Permission.VIEW_STUDENT_ANALYTICS,
    Permission.MANAGE_COLLEGE_ADMIN,
  ],

  COMPANY_ADMIN: [
    Permission.EDIT_COMPANY,
    Permission.APPROVE_JOB,
    Permission.EDIT_ANY_JOB,
  ],

  TPO: [
    Permission.MANAGE_PLACEMENT_DRIVES,
    Permission.SEND_DRIVE_INVITES,
    Permission.VIEW_STUDENT_ANALYTICS,
  ],

  CDCR: [
    Permission.MANAGE_REFERRALS,
    Permission.VIEW_REFERRAL_BOARD,
  ],

  USER: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derives the set of permissions a user holds based on their roles.
 * Used internally by enforce.ts.
 */
export function getUserPermissions(userRoles: string[]): Set<Permission> {
  const permissions = new Set<Permission>();
  for (const role of userRoles) {
    const rolePerms = ROLE_PERMISSIONS[role] ?? [];
    for (const perm of rolePerms) {
      permissions.add(perm);
    }
  }
  return permissions;
}
