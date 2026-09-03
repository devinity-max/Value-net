import { AuthUser, UserRole } from '../types';

export type PermissionAction =
  | 'MANAGE_FRUITS'
  | 'DELETE_FRUITS'
  | 'VIEW_AUDIT_LOGS'
  | 'MANAGE_GIVEAWAYS'
  | 'MODERATE_TRADES'
  | 'MANAGE_USERS'
  | 'CONFIGURE_SYSTEM'
  | 'HOST_GIVEAWAYS'
  | 'CREATE_ADS'
  | 'ACCESS_MODERATION'
  | 'ACCESS_ADMIN'
  | 'ASSIGN_ROLES'
  | 'BAN_USERS'
  | 'RESOLVE_REPORTS';

export function isRootOwner(user?: AuthUser | null): boolean {
  if (!user) return false;
  return user.role === 'ROOT_OWNER' || user.username?.toLowerCase() === 'yami' || user.username?.toLowerCase() === 'void';
}

export const isOwner = isRootOwner;

export function isAdmin(user?: AuthUser | null): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || isRootOwner(user);
}

export function isModerator(user?: AuthUser | null): boolean {
  if (!user) return false;
  return user.role === 'MODERATOR' || isAdmin(user);
}

export function isApprovedCreator(user?: AuthUser | null): boolean {
  if (!user) return false;
  return user.role === 'APPROVED_CREATOR' || isModerator(user);
}

/** Check if user can host giveaways (CREATOR, MODERATOR, ADMIN, ROOT_OWNER) */
export function canHostGiveaways(user?: AuthUser | null): boolean {
  return isApprovedCreator(user);
}

/** Check if user can access the dedicated Moderation Center (MODERATOR, ADMIN, ROOT_OWNER) */
export function canAccessModeration(user?: AuthUser | null): boolean {
  return isModerator(user);
}

/** Check if user can access the dedicated Admin Control Center (ADMIN, ROOT_OWNER) */
export function canAccessAdmin(user?: AuthUser | null): boolean {
  return isAdmin(user);
}

/** Hierarchy numeric values for staff protection */
const ROLE_WEIGHT: Record<UserRole, number> = {
  MEMBER: 0,
  APPROVED_CREATOR: 1,
  MODERATOR: 2,
  ADMIN: 3,
  ROOT_OWNER: 4,
};

/**
 * Validates whether actingUser has authority to moderate targetUser.
 * Lower staff CANNOT moderate higher staff or equal staff.
 * Users CANNOT moderate themselves.
 */
export function canModerateUser(actingUser?: AuthUser | null, targetUserRole?: UserRole, targetUserId?: string): boolean {
  if (!actingUser) return false;
  if (targetUserId && actingUser.id === targetUserId) return false; // Self-target protection
  if (!isModerator(actingUser)) return false;
  if (isRootOwner(actingUser)) return true;

  const actingWeight = ROLE_WEIGHT[actingUser.role] || 0;
  const targetWeight = ROLE_WEIGHT[targetUserRole || 'MEMBER'] || 0;

  return actingWeight > targetWeight;
}

/**
 * Validates whether actingUser has authority to assign requestedRole to targetUser.
 * Rules:
 * - MEMBER / CREATOR / MODERATOR: CANNOT assign any roles.
 * - ADMIN: Can assign MEMBER, APPROVED_CREATOR, MODERATOR (CANNOT assign ADMIN or ROOT_OWNER).
 * - ROOT_OWNER: Can assign any role up to ADMIN or ROOT_OWNER.
 * - No user can change their own role.
 */
export function canAssignRole(actingUser?: AuthUser | null, targetUserRole?: UserRole, requestedRole?: UserRole, targetUserId?: string): boolean {
  if (!actingUser || !requestedRole) return false;
  if (targetUserId && actingUser.id === targetUserId) return false; // Self-role change protection
  if (!isAdmin(actingUser)) return false;

  // Cannot modify ROOT_OWNER
  if (targetUserRole === 'ROOT_OWNER' && !isRootOwner(actingUser)) return false;
  if (requestedRole === 'ROOT_OWNER' && !isRootOwner(actingUser)) return false;

  if (isRootOwner(actingUser)) return true;

  // ADMIN can assign MEMBER, APPROVED_CREATOR, MODERATOR
  if (actingUser.role === 'ADMIN') {
    return requestedRole === 'MEMBER' || requestedRole === 'APPROVED_CREATOR' || requestedRole === 'MODERATOR';
  }

  return false;
}

export function hasPermission(user: AuthUser | null | undefined, action: PermissionAction): boolean {
  if (!user) return false;
  if (isRootOwner(user)) return true;

  switch (action) {
    case 'CONFIGURE_SYSTEM':
    case 'DELETE_FRUITS':
      return isRootOwner(user);
    case 'MANAGE_FRUITS':
    case 'VIEW_AUDIT_LOGS':
    case 'MANAGE_USERS':
    case 'ACCESS_ADMIN':
      return isAdmin(user);
    case 'MODERATE_TRADES':
    case 'ACCESS_MODERATION':
    case 'BAN_USERS':
    case 'RESOLVE_REPORTS':
      return isModerator(user);
    case 'MANAGE_GIVEAWAYS':
    case 'HOST_GIVEAWAYS':
      return isApprovedCreator(user);
    case 'CREATE_ADS':
      return true;
    default:
      return false;
  }
}

export function getRoleBadgeColor(role?: UserRole): { bg: string; text: string; border: string } {
  switch (role) {
    case 'ROOT_OWNER':
      return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' };
    case 'ADMIN':
      return { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' };
    case 'MODERATOR':
      return { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/40' };
    case 'APPROVED_CREATOR':
      return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' };
    default:
      return { bg: 'bg-slate-800/60', text: 'text-slate-400', border: 'border-slate-700/50' };
  }
}
