import { UserRole, AuthUser } from '../types';

export function getRoleBadgeInfo(role: UserRole | string): {
  label: string;
  bg: string;
  border: string;
  text: string;
  icon: string;
  color: string;
} {
  switch (role) {
    case 'ROOT_OWNER':
      return {
        label: 'ROOT OWNER',
        bg: 'bg-rose-950/80',
        border: 'border-rose-500/60',
        text: 'text-rose-300',
        icon: 'verified',
        color: 'bg-rose-950/80 border-rose-500/60 text-rose-300',
      };
    case 'ADMIN':
      return {
        label: 'ADMINISTRATOR',
        bg: 'bg-amber-950/80',
        border: 'border-amber-500/60',
        text: 'text-amber-300',
        icon: 'admin_panel_settings',
        color: 'bg-amber-950/80 border-amber-500/60 text-amber-300',
      };
    case 'MODERATOR':
      return {
        label: 'MODERATOR',
        bg: 'bg-sky-950/80',
        border: 'border-sky-500/60',
        text: 'text-sky-300',
        icon: 'shield',
        color: 'bg-sky-950/80 border-sky-500/60 text-sky-300',
      };
    case 'APPROVED_CREATOR':
    case 'CREATOR':
      return {
        label: 'VERIFIED CREATOR',
        bg: 'bg-purple-950/80',
        border: 'border-purple-500/60',
        text: 'text-purple-300',
        icon: 'movie',
        color: 'bg-purple-950/80 border-purple-500/60 text-purple-300',
      };
    case 'VIP':
      return {
        label: 'VIP TRADER',
        bg: 'bg-emerald-950/80',
        border: 'border-emerald-500/60',
        text: 'text-emerald-300',
        icon: 'star',
        color: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300',
      };
    case 'BANNED':
      return {
        label: 'BANNED',
        bg: 'bg-red-950/90',
        border: 'border-red-600',
        text: 'text-red-400',
        icon: 'block',
        color: 'bg-red-950/90 border-red-600 text-red-400',
      };
    default:
      return {
        label: 'MEMBER',
        bg: 'bg-slate-900',
        border: 'border-slate-700',
        text: 'text-slate-300',
        icon: 'person',
        color: 'bg-slate-900 border-slate-700 text-slate-300',
      };
  }
}

export function isOwner(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  const role = user.role || user.profile?.role;
  return role === 'ROOT_OWNER' || (user.email || '').trim().toLowerCase() === 'dmg73364@gmail.com';
}

export function isAdmin(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  const role = user.role || user.profile?.role;
  return isOwner(user) || role === 'ADMIN';
}

export function canModerate(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  const role = user.role || user.profile?.role;
  return isOwner(user) || role === 'ADMIN' || role === 'MODERATOR';
}

export function hasPermission(
  userOrRole: AuthUser | UserRole | string | null | undefined,
  permission: string
): boolean {
  if (!userOrRole) return false;
  
  let role: string = '';
  let email: string = '';

  if (typeof userOrRole === 'string') {
    role = userOrRole;
  } else if (typeof userOrRole === 'object') {
    role = (userOrRole as AuthUser).role || (userOrRole as AuthUser).profile?.role || 'MEMBER';
    email = ((userOrRole as AuthUser).email || '').trim().toLowerCase();
  }

  if (email === 'dmg73364@gmail.com' || role === 'ROOT_OWNER') {
    return true;
  }

  switch (permission) {
    case 'ACCESS_ADMIN_PANEL':
    case 'ACCESS_CATALOG_ADMIN':
    case 'MANAGE_PLATFORM_SETTINGS':
      return role === 'ROOT_OWNER' || role === 'ADMIN';
    case 'ACCESS_CREATOR_PANEL':
    case 'CREATE_GIVEAWAYS':
      return role === 'ROOT_OWNER' || role === 'ADMIN' || role === 'CREATOR';
    case 'MODERATE_DISPUTES':
    case 'BAN_USERS':
    case 'DELETE_TRADES':
      return role === 'ROOT_OWNER' || role === 'ADMIN' || role === 'MODERATOR';
    case 'CREATE_TRADES':
    case 'CHAT':
      return role !== 'BANNED';
    default:
      return true;
  }
}
