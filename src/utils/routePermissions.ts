import type { ModeratorPermissions } from '@/services/api';

/**
 * Dashboard yo‘li → moderator `view` moduli.
 * `always` — bosh sahifa va profil (chiqish uchun).
 * Eng uzun prefiks yutadi.
 */
const ROUTE_VIEW: Array<[string, keyof ModeratorPermissions | 'always']> = [
  ['/dashboard/home', 'always'],
  ['/dashboard/notifications', 'notifications'],
  ['/dashboard/moderators', 'moderators'],
  ['/dashboard/approvers', 'approvers'],
  ['/dashboard/permissions', 'permissions'],
  ['/dashboard/organizations', 'organizations'],
  ['/dashboard/violations', 'violations'],
  ['/dashboard/logs', 'logs'],
  ['/dashboard/user-activity', 'logs'],
  ['/dashboard/telegram-news', 'telegramBot'],
  ['/dashboard/telegram-bot', 'telegramBot'],
  ['/dashboard/levels', 'contentLevels'],
  ['/dashboard/lessons', 'contentLevels'],
  ['/dashboard/audio-library', 'audioLibrary'],
  ['/dashboard/theories', 'contentTheories'],
  ['/dashboard/questions', 'contentQuestions'],
  ['/dashboard/employees', 'students'],
  ['/dashboard/students', 'students'],
  ['/dashboard/approvals', 'approvals'],
  ['/dashboard/departments', 'organizations'],
  ['/dashboard/positions', 'exams'],
  ['/dashboard/nes-sync', 'nesSync'],
  ['/dashboard/archive', 'archive'],
  ['/dashboard/analytics', 'analytics'],
  ['/dashboard/reports', 'reports'],
  ['/dashboard/plan-calendar', 'planCalendar'],
  ['/dashboard/custom-plans', 'customPlans'],
  ['/dashboard/hearts-analytics', 'analytics'],
  ['/dashboard/leaderboard', 'analytics'],
  ['/dashboard/anomaloz', 'anomaloz'],
  ['/dashboard/profile', 'always'],
  ['/dashboard/ai-assistant', 'aiAssistant'],
  ['/dashboard/import-export', 'importExport'],
];

export function permissionForPath(
  pathname: string,
): keyof ModeratorPermissions | 'always' | null {
  if (pathname === '/dashboard') return 'always';
  const hit = ROUTE_VIEW.filter(
    ([path]) => pathname === path || pathname.startsWith(`${path}/`),
  ).sort((a, b) => b[0].length - a[0].length)[0];
  return hit ? hit[1] : null;
}
