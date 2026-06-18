import type { Role } from '@/services/api';

export function readCachedUserRole(): Role | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return (JSON.parse(raw) as { role?: Role }).role ?? null;
  } catch {
    return null;
  }
}

export function isSuperAdmin(): boolean {
  return readCachedUserRole() === 'SUPERADMIN';
}
