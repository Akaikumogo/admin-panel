import type { CrudPermissions, ModeratorPermissions } from '@/services/api';

const EMPTY_CRUD: CrudPermissions = {
  view: false,
  create: false,
  update: false,
  delete: false,
};

const DEFAULT_SAFETY: CrudPermissions = {
  view: true,
  create: true,
  update: true,
  delete: false,
};

const KEYS: (keyof ModeratorPermissions)[] = [
  'contentLevels',
  'contentTheories',
  'contentQuestions',
  'organizations',
  'students',
  'users',
  'moderators',
  'profile',
  'exams',
  'audioLibrary',
  'analytics',
  'permissions',
  'violations',
  'logs',
  'nesSync',
  'aiAssistant',
  'safetyRecords',
  'telegramBot',
];

/** Eski API javoblarida yangi modullar bo‘lmasa — default bilan to‘ldiradi. */
export function mergeModeratorPermissions(
  partial?: Partial<ModeratorPermissions> | null,
): ModeratorPermissions {
  const out = {} as ModeratorPermissions;
  for (const key of KEYS) {
    const def = key === 'safetyRecords' ? DEFAULT_SAFETY : EMPTY_CRUD;
    const p = partial?.[key];
    out[key] = {
      view: p?.view ?? def.view,
      create: p?.create ?? def.create,
      update: p?.update ?? def.update,
      delete: p?.delete ?? def.delete,
    };
  }
  return out;
}
