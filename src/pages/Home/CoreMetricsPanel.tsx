import { useMemo, type ComponentType } from 'react';
import {
  Activity,
  Building2,
  HelpCircle,
  Layers,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Skeleton } from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import type { AnalyticsSummary } from '@/services/api';
import { cn } from '@/lib/utils';
import { formatDelta } from './branchName';
import { MiniSparkline } from './MiniSparkline';

type KpiKey = keyof Pick<
  AnalyticsSummary,
  | 'totalUsers'
  | 'activeUsers7d'
  | 'totalOrganizations'
  | 'totalModerators'
  | 'totalLevels'
  | 'totalQuestions'
>;

type KpiDef = {
  key: KpiKey;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  featured?: boolean;
  hint?: { uz: string; en: string; ru: string };
};

const KPI_DEFS: KpiDef[] = [
  {
    key: 'totalUsers',
    icon: Users,
    featured: true,
    hint: {
      uz: 'Roʻyxatdan oʻtgan',
      en: 'Registered total',
      ru: 'Всего зарегистрировано',
    },
  },
  {
    key: 'activeUsers7d',
    icon: Activity,
    featured: true,
    hint: {
      uz: 'Oxirgi 7 kun',
      en: 'Last 7 days',
      ru: 'За 7 дней',
    },
  },
  {
    key: 'totalOrganizations',
    icon: Building2,
    hint: { uz: 'Faol filiallar', en: 'Active branches', ru: 'Активные филиалы' },
  },
  {
    key: 'totalModerators',
    icon: Shield,
    hint: { uz: 'Boshqaruv', en: 'Ops access', ru: 'Доступ к панели' },
  },
  {
    key: 'totalLevels',
    icon: Layers,
    hint: { uz: 'Oʻquv yoʻli', en: 'Learning path', ru: 'Учебный путь' },
  },
  {
    key: 'totalQuestions',
    icon: HelpCircle,
    hint: { uz: 'Bazadagi bank', en: 'Question bank', ru: 'Банк вопросов' },
  },
];

const KPI_LABELS: Record<KpiKey, { uz: string; en: string; ru: string }> = {
  totalUsers: {
    uz: 'Foydalanuvchilar',
    en: 'Users',
    ru: 'Пользователи',
  },
  activeUsers7d: { uz: 'Faol (7 kun)', en: 'Active (7d)', ru: 'Активные (7д)' },
  totalOrganizations: {
    uz: 'Tashkilotlar',
    en: 'Organizations',
    ru: 'Организации',
  },
  totalModerators: { uz: 'Moderatorlar', en: 'Moderators', ru: 'Модераторы' },
  totalLevels: { uz: 'Modullar', en: 'Modules', ru: 'Модули' },
  totalQuestions: { uz: 'Savollar', en: 'Questions', ru: 'Вопросы' },
};

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 };

function DeltaBadge({ percent }: { percent: number | null | undefined }) {
  const { text, up } = formatDelta(percent);
  if (up === null) return null;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
        up
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
      )}
    >
      <Icon size={11} strokeWidth={2.25} />
      {text}
    </span>
  );
}

function KpiMetric({
  label,
  value,
  icon: Icon,
  loading,
  sparkValues,
  deltaPercent,
  hint,
  featured,
  index,
}: {
  label: string;
  value: number;
  icon: KpiDef['icon'];
  loading: boolean;
  sparkValues?: number[];
  deltaPercent?: number | null;
  hint?: string;
  featured?: boolean;
  index: number;
}) {
  const hasSpark = (sparkValues?.length ?? 0) > 1;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: index * 0.05 }}
      className={cn(
        'group relative flex min-h-[116px] flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-4',
        'shadow-[0_12px_28px_-18px_rgba(15,23,42,0.18)]',
        'transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--shell-rail)_28%,var(--border))]',
        'hover:shadow-[0_18px_36px_-20px_rgba(29,78,216,0.28)]',
        'active:scale-[0.985]',
        featured && 'sm:min-h-[132px]',
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--shell-rail)_55%,transparent)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          {loading ? (
            <Skeleton.Input active size="small" className="mt-3 !h-8 !w-24" />
          ) : (
            <p className="mt-2 text-[1.75rem] font-semibold leading-none tracking-tight text-slate-900 tabular-nums dark:text-slate-50">
              {value.toLocaleString()}
            </p>
          )}
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--shell-rail)_12%,transparent)] text-[var(--shell-rail)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
          <Icon size={16} strokeWidth={1.75} />
        </span>
      </div>

      <div className="mt-4 flex min-h-[28px] items-end justify-between gap-2">
        <div className="min-w-0">
          {loading ? null : deltaPercent != null ? (
            <DeltaBadge percent={deltaPercent} />
          ) : hint ? (
            <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
              {hint}
            </p>
          ) : null}
        </div>
        {!loading && hasSpark ? (
          <MiniSparkline values={sparkValues!} stroke="var(--shell-rail)" />
        ) : null}
      </div>
    </motion.article>
  );
}

export function CoreMetricsPanel({
  summary,
  loading,
  weekSpark,
  planSpark,
  loginDeltaPercent,
}: {
  summary: AnalyticsSummary | null;
  loading: boolean;
  weekSpark: number[];
  planSpark: number[];
  loginDeltaPercent?: number | null;
}) {
  const { t } = useTranslation();
  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    [],
  );

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--shell-rail)]">
            {t({
              uz: 'Asosiy ko‘rsatkichlar',
              en: 'Core metrics',
              ru: 'Ключевые метрики',
            })}
          </p>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {t({
              uz: 'Platforma holati — bir qarashda',
              en: 'Platform pulse at a glance',
              ru: 'Состояние платформы одним взглядом',
            })}
          </p>
        </div>
        <time
          dateTime={new Date().toISOString().slice(0, 10)}
          className="rounded-md border border-border/80 bg-card/80 px-2 py-1 text-[11px] font-medium tabular-nums text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:text-slate-400"
        >
          {dateLabel}
        </time>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-8">
        {KPI_DEFS.map((def, index) => {
          const spark =
            def.key === 'activeUsers7d'
              ? weekSpark
              : def.key === 'totalUsers'
                ? planSpark
                : undefined;

          return (
            <div
              key={def.key}
              className={cn(def.featured ? 'lg:col-span-2' : 'lg:col-span-1')}
            >
              <KpiMetric
                index={index}
                label={t(KPI_LABELS[def.key])}
                icon={def.icon}
                loading={loading}
                value={summary?.[def.key] ?? 0}
                sparkValues={spark}
                deltaPercent={
                  def.key === 'activeUsers7d' ? loginDeltaPercent : undefined
                }
                hint={def.hint ? t(def.hint) : undefined}
                featured={def.featured}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
