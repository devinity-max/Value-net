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
  | 'CREATE_ADS';

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
      return isAdmin(user);
    case 'MODERATE_TRADES':
      return isModerator(user);
    case 'MANAGE_GIVEAWAYS':
    case 'HOST_GIVEAWAYS':
      return isApprovedCreator(user) || isModerator(user);
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
