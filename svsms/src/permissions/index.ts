/**
 * Centralized Role & Permission System.
 * Canonical roles: OWNER, MANAGER, MECHANIC, CUSTOMER
 */

export type CanonicalRole = 'OWNER' | 'MANAGER' | 'MECHANIC' | 'CUSTOMER' | 'UNKNOWN';

export const normalizeRole = (role: string | null | undefined): CanonicalRole => {
  if (!role) return 'UNKNOWN';
  const clean = role.trim().toUpperCase();
  if (clean === 'OWNER' || clean === 'ADMIN') return 'OWNER';
  if (clean === 'MANAGER') return 'MANAGER';
  if (clean === 'MECHANIC') return 'MECHANIC';
  if (clean === 'CUSTOMER') return 'CUSTOMER';
  return 'UNKNOWN';
};

export const isRoleAllowed = (
  userRole: string | null | undefined,
  allowedRoles?: string[]
): boolean => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const userNorm = normalizeRole(userRole);
  if (userNorm === 'UNKNOWN') return false;

  return allowedRoles.some((r) => {
    const allowedNorm = normalizeRole(r);
    return allowedNorm === userNorm;
  });
};

export const getDashboardRoute = (role: string | null | undefined): string => {
  const norm = normalizeRole(role);
  switch (norm) {
    case 'OWNER':
      return '/owner';
    case 'MANAGER':
      return '/manager';
    case 'MECHANIC':
      return '/mechanic/jobs';
    case 'CUSTOMER':
      return '/customer';
    default:
      return '/login';
  }
};
