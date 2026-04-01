import type { CrudPermissions, ModeratorPermissions, Role } from '@/services/api';
import { readCachedModeratorPermissions } from './permissions';

function readCachedUserRole(): Role | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const u = JSON.parse(raw) as { role?: Role };
    return u.role ?? null;
  } catch {
    return null;
  }
}

export function can(moduleKey: keyof ModeratorPermissions, action: keyof CrudPermissions): boolean {
  const role = readCachedUserRole();
  if (role === 'SUPERADMIN') return true;
  if (role !== 'MODERATOR') return false;
  const perms = readCachedModeratorPermissions();
  return !!perms?.[moduleKey]?.[action];
}

