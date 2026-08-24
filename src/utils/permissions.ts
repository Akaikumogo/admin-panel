import type { ModeratorPermissions } from '@/services/api';
import { mergeModeratorPermissions } from './moderatorPermissions';

const KEY = 'myModeratorPermissions';

export function readCachedModeratorPermissions(): ModeratorPermissions | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return mergeModeratorPermissions(JSON.parse(raw) as Partial<ModeratorPermissions>);
  } catch {
    return null;
  }
}

export function cacheModeratorPermissions(p: ModeratorPermissions | null) {
  try {
    if (!p) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(mergeModeratorPermissions(p)));
  } catch {
    /* ignore */
  }
}

