import { User } from "../types/models";

const SUPER_ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"]);

/**
 * Checks if a user has a specific role name either as a primary role or in their roles array.
 */
export const hasRole = (user: User | null | undefined, roleName: string): boolean => {
  if (!user) return false;
  return (
    user.primaryRole === roleName ||
    Boolean(user.roles?.some((ur) => ur.role?.name === roleName))
  );
};

/**
 * Checks if the user is a platform admin or super admin.
 */
export const isPlatformAdmin = (user?: User | null): boolean => {
  return hasRole(user, "PLATFORM_ADMIN") || hasRole(user, "SUPER_ADMIN");
};

/**
 * Checks if the user has platform super admin / admin permissions via roles array.
 */
export const isSuperOrPlatformAdmin = (user?: User | null): boolean => {
  if (!user?.roles) return false;
  return user.roles.some(
    (ur) => ur.role?.name && SUPER_ADMIN_ROLES.has(ur.role.name)
  );
};

/**
 * Checks if the user is registered as a recruiter.
 */
export const isRecruiter = (user?: User | null): boolean => {
  return hasRole(user, "RECRUITER");
};

/**
 * Checks if the user is a Training & Placement Officer (TPO) or College Admin.
 */
export const isTpo = (user?: User | null): boolean => {
  return hasRole(user, "TPO") || hasRole(user, "COLLEGE_ADMIN");
};

/**
 * Checks if the user is a student, recruiter, or professional.
 */
export const isCollegeStaff = (user?: User | null): boolean => {
  if (!user) return false;
  return (
    user.primaryRole === "COLLEGE_ADMIN" ||
    user.primaryRole === "TPO" ||
    user.primaryRole === "CDCR"
  );
};

/**
 * Checks if the user is a College Admin, TPO, or CDCR for a specific college.
 */
export const isCollegeAdminFor = (user: User | null | undefined, collegeId: string): boolean => {
  if (!user) return false;
  if (isSuperOrPlatformAdmin(user)) return true;
  const isAdmin = user.collegeAdminships?.some((adm) => adm.collegeId === collegeId);
  const isTpoMember = user.tpoMemberships?.some((t) => t.collegeId === collegeId);
  const isCdcrMember = user.cdcrMemberships?.some((cdcr) => cdcr.collegeId === collegeId);
  return Boolean(isAdmin || isTpoMember || isCdcrMember);
};

/**
 * Checks if the user is TPO or College Admin for a specific college.
 */
export const isTpoFor = (user: User | null | undefined, collegeId: string): boolean => {
  if (!user) return false;
  if (isSuperOrPlatformAdmin(user)) return true;
  const isAdmin = user.collegeAdminships?.some((adm) => adm.collegeId === collegeId);
  if (isAdmin) return true;
  return Boolean(user.tpoMemberships?.some((t) => t.collegeId === collegeId));
};

/**
 * Checks if the user is CDCR, TPO, or College Admin for a specific college.
 */
export const isCdcrFor = (user: User | null | undefined, collegeId: string): boolean => {
  if (!user) return false;
  if (isTpoFor(user, collegeId)) return true;
  return Boolean(user.cdcrMemberships?.some((cdcr) => cdcr.collegeId === collegeId));
};
