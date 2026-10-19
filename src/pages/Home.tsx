import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  Plus,
  UserRound,
  Wifi,
} from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { AvatarPreview } from '@/components/AvatarPreview';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import { formatPersonName } from '@/lib/person-name';
import { cn } from '@/lib/utils';
import apiService, {
  userActivityApi,
  type ExecutiveDashboard,
  type OnlineUserRow,
  type Underperformers,
  type UserProfile,
} from '@/services/api';
import {
  estimateEodPercent,
  formatNumber,
  todayStr,
} from '@/pages/Analytics/analytics-utils';

const emptyDash: ExecutiveDashboard = {
  planDate: todayStr(),
  dailyGoalCorrect: 10,
  totalPlan: 0,
  completedTotal: 0,
  extraCorrectTotal: 0,
  remaining: 0,
  completionPercent: 0,
  totalEmployees: 0,
  activeEmployees: 0,
  completedEmployees: 0,
  branchCount: 0,
};

const emptyUnder: Underperformers = {
  planDate: todayStr(),
  threshold: 70,
  branchCount: 0,
  divisionCount: 0,
  employeeCount: 0,
  branches: [],
};

function roleLabel(role: string, t: (m: { uz: string; en: string; ru: string }) => string) {
  if (role === 'MODERATOR') {
    return t({ uz: 'Moderator', en: 'Moderator', ru: 'Модератор' });
  }
  if (role === 'APPROVER') {
    return t({ uz: 'Tasdiqlovchi', en: 'Approver', ru: 'Утверждающий' });
  }
  if (role === 'SUPERADMIN') {
    return t({ uz: 'Admin', en: 'Admin', ru: 'Админ' });
  }
  if (role === 'ACCOUNTING') {
    return t({ uz: 'Hisob', en: 'Accounting', ru: 'Бухгалтерия' });
  }
  return t({ uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' });
}

function formatOnlineFor(sec: number): string {
  if (!sec || sec < 60) return `${sec || 0}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}s ${m}m`;
  return `${m}m`;
}

export default function HomePage() {
  const { t } = useTranslation();
  const today = todayStr();
  const hour = new Date().getHours();

  const { data: me, initialLoading: meLoading } = useFetch<UserProfile | null>(
    ['me'],
    () => apiService.me(),
    null,
  );

  const ready = !!me;

  const { data: dashboard, initialLoading: dashLoading } =
    useFetch<ExecutiveDashboard>(
      ['home-executive-dashboard', today],
      () => apiService.getExecutiveDashboard({ date: today }),
      emptyDash,
      { enabled: ready },
    );

  const { data: onlineUsers, initialLoading: onlineLoading } = useFetch<
    OnlineUserRow[]
  >(
    ['home-online-users'],
    () => userActivityApi.listOnline({}),
    [],
    { enabled: ready, refetchInterval: 30_000 },
  );

  const { data: under, initialLoading: underLoading } = useFetch<Underperformers>(
    ['home-underperformers', today],
    () => apiService.getUnderperformers({ date: today, threshold: 70 }),
    emptyUnder,
    { enabled: ready },
  );

  const { data: pendingApprovals } = useFetch<{ total: number }>(
    ['home-pending-approvals'],
    () => apiService.getPendingSafetyApprovalsCount(),
    { total: 0 },
    { enabled: ready, refetchInterval: 30_000 },
  );

  const eod = estimateEodPercent(dashboard.completionPercent, hour);
  const onlineCount = onlineUsers.length;
  const pendingCount = pendingApprovals.total ?? 0;
  const weakest = under.branches[0] ?? null;

  const dateLabel = new Date().toLocaleDateString('uz-UZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  const loading = meLoading || dashLoading;

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-6 overflow-x-hidden">
      <PageHeader
        icon={Activity}
        title={t({
          uz: `Salom${me?.firstName ? `, ${me.firstName}` : ''}`,
          en: `Hello${me?.firstName ? `, ${me.firstName}` : ''}`,
          ru: `Здравствуйте${me?.firstName ? `, ${me.firstName}` : ''}`,
        })}
        description={
          <span className="inline-flex items-center gap-1.5 capitalize">
            <CalendarDays className="h-3.5 w-3.5" />
            {dateLabel}
            <span className="text-muted-foreground/50">·</span>
            {t({
              uz: 'Bugungi holat — 5 soniyada',
              en: "Today's pulse — in 5 seconds",
              ru: 'Статус на сегодня — за 5 секунд',
            })}
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/analytics">
                {t({ uz: 'Analitika', en: 'Analytics', ru: 'Аналитика' })}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/reports">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {t({ uz: 'Hisobotlar', en: 'Reports', ru: 'Отчёты' })}
              </Link>
            </Button>
            <Button asChild type="primary" size="sm">
              <Link to="/dashboard/employees">
                <Plus className="h-3.5 w-3.5" />
                {t({ uz: 'Xodimlar', en: 'Employees', ru: 'Сотрудники' })}
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi
          loading={loading}
          label={t({ uz: 'Bajarilish', en: 'Completion', ru: 'Выполнение' })}
          value={`${dashboard.completionPercent}%`}
          hint={t({
            uz: `Kun oxiri ~${eod}%`,
            en: `EOD ~${eod}%`,
            ru: `К концу дня ~${eod}%`,
          })}
        />
        <Kpi
          loading={loading}
          label={t({ uz: 'Qoldi', en: 'Remaining', ru: 'Осталось' })}
          value={formatNumber(dashboard.remaining)}
          hint={`${formatNumber(dashboard.completedTotal)} / ${formatNumber(dashboard.totalPlan)}`}
        />
        <Kpi
          loading={loading || onlineLoading}
          label={t({ uz: 'Online', en: 'Online', ru: 'Онлайн' })}
          value={formatNumber(onlineCount)}
          hint={t({
            uz: 'hozir sessiyada',
            en: 'in session now',
            ru: 'сейчас в сессии',
          })}
          accent
        />
      </div>

      {/* Diqqat */}
      <section className="space-y-2">
        <h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {t({ uz: 'Diqqat', en: 'Needs attention', ru: 'Внимание' })}
        </h2>
        <div className="space-y-2">
          {(under.branchCount > 0 || underLoading) && (
            <AlertRow
              loading={underLoading}
              icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
              title={t({
                uz: 'Rejani bajarmayotganlar',
                en: 'Underperformers',
                ru: 'Не выполняют план',
              })}
              detail={
                underLoading
                  ? '…'
                  : `${under.branchCount} ${t({ uz: 'filial', en: 'branches', ru: 'фил.' })} · ${formatNumber(under.employeeCount)} ${t({ uz: 'xodim', en: 'employees', ru: 'сотр.' })}${
                      weakest
                        ? ` · ${t({ uz: 'eng sust', en: 'weakest', ru: 'слабый' })}: ${weakest.orgName} (${weakest.percent}%)`
                        : ''
                    }`
              }
              to={`/dashboard/analytics/underperformers?date=${today}`}
            />
          )}

          {pendingCount > 0 && (
            <AlertRow
              icon={<ClipboardCheck className="h-4 w-4 text-rose-600" />}
              title={t({
                uz: 'Tasdiq kutmoqda',
                en: 'Pending approvals',
                ru: 'Ждут утверждения',
              })}
              detail={`${pendingCount} ${t({ uz: 'ta so‘rov', en: 'requests', ru: 'заявок' })}`}
              to="/dashboard/approvals"
            />
          )}

          {!underLoading && under.branchCount === 0 && pendingCount === 0 && (
            <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              {t({
                uz: 'Hozircha shoshilinch narsa yo‘q.',
                en: 'Nothing urgent right now.',
                ru: 'Срочных задач нет.',
              })}
            </div>
          )}
        </div>
      </section>

      {/* Online kim */}
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
              {t({ uz: 'Hozir online', en: 'Online now', ru: 'Сейчас онлайн' })}
            </h2>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {onlineCount}
            </span>
          </div>
          <Link
            to="/dashboard/user-activity"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Wifi className="h-3.5 w-3.5" />
            {t({ uz: 'Batafsil', en: 'Details', ru: 'Подробнее' })}
          </Link>
        </div>

        {onlineLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : onlineCount === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <UserRound className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {t({
                uz: 'Hozir hech kim online emas',
                en: 'Nobody is online right now',
                ru: 'Сейчас никто не онлайн',
              })}
            </p>
          </div>
        ) : (
          <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
            {onlineUsers.map((u) => {
              const name = formatPersonName({
                lastName: u.lastName,
                firstName: u.firstName,
              });
              return (
                <li key={u.userId}>
                  <Link
                    to={`/dashboard/employees/${u.userId}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="relative shrink-0">
                      <AvatarPreview
                        name={name}
                        initials={`${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`}
                        size={36}
                        avatarClassName="bg-gradient-to-br from-slate-600 to-slate-800"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold tracking-tight text-foreground">
                        {name}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {roleLabel(u.role, t)}
                        {u.organizationName ? ` · ${u.organizationName}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {formatOnlineFor(u.durationSeconds)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  loading,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4',
        accent && 'border-emerald-500/25 bg-emerald-500/[0.04]',
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <>
          <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {value}
          </p>
          {hint ? (
            <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>
          ) : null}
        </>
      )}
    </div>
  );
}

function AlertRow({
  icon,
  title,
  detail,
  to,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  to: string;
  loading?: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/40"
    >
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {loading ? (
          <Skeleton className="mt-1 h-3 w-48" />
        ) : (
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        )}
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
