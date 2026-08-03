export type PlanPeriod = 'daily' | 'monthly' | 'yearly';

/** Hisobotlar / Home / PlanResultsTable uchun umumiy URL query kalitlari */
export const PLAN_QP_DEFAULTS = {
  period: 'monthly' as PlanPeriod,
  day: undefined as string | undefined,
  month: undefined as string | undefined,
  year: undefined as string | undefined,
  page: undefined as string | undefined,
  limit: undefined as string | undefined,
  fullName: undefined as string | undefined,
  orgName: undefined as string | undefined,
} as const;
