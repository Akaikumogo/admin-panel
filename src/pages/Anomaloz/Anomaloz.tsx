import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Spin,
  Table,
  Tag,
  Typography,
} from '@/components/ui';
import { AlertTriangle, RefreshCw, Wrench } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type {
  UserProfile,
  XpAnomalyAudit,
  XpAnomalyReconcileResult,
  XpAnomalySample,
  XpAnomalyUserRow,
} from '@/services/api';

const { Text } = Typography;

const T = {
  title: { uz: 'Anomaloz', en: 'Anomalies', ru: 'Аномалии' },
  subtitle: {
    uz: 'Plandan tashqari berilgan ballarni topish va reytingdan ayirish. Ball faqat kunlik majburiyat (kuniga 10) uchun.',
    en: 'Find off-plan XP and remove it from the rating. Points only for daily plan (10/day).',
    ru: 'Найти внеплановые баллы и убрать из рейтинга. Баллы только за дневной план (10/день).',
  },
  scan: { uz: 'Tekshirish', en: 'Scan', ru: 'Проверить' },
  fix: {
    uz: 'Plandan tashqari ballarni ayirish',
    en: 'Remove off-plan XP',
    ru: 'Убрать внеплановые баллы',
  },
  fixHint: {
    uz: 'Har kunning birinchi 10 ta noyob to‘g‘ri javobi qoladi; qolganlari reytingdan ayiriladi. Variant noto‘g‘ri belgilanganlar ham tuzatiladi.',
    en: 'Keeps first 10 unique correct answers per day; removes the rest from rating.',
    ru: 'Оставляет первые 10 уникальных верных ответов за день; остальное убирает из рейтинга.',
  },
  onlySuper: {
    uz: 'Faqat SUPERADMIN',
    en: 'SUPERADMIN only',
    ru: 'Только SUPERADMIN',
  },
} as const;

const REASON_LABEL: Record<string, string> = {
  off_plan_xp: 'Plandan tashqari XP',
  missing_plan_xp: 'Plan XP yetishmayapti',
  is_correct_mismatch: 'Ball ≠ javob',
  heart_lost_mismatch: 'heart_lost nomuvofiq',
  selected_option_missing: 'Variant yo‘q',
  option_deleted: 'Variant o‘chirilgan',
  option_wrong_question: 'Noto‘g‘ri savol varianti',
};

export default function AnomalozPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [reconciling, setReconciling] = useState(false);
  const [lastFix, setLastFix] = useState<XpAnomalyReconcileResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: me, initialLoading: meLoading } = useFetch<UserProfile | null>(
    ['me'],
    () => apiService.me(),
    null,
  );

  const {
    data: audit,
    loading,
    initialLoading,
  } = useFetch<XpAnomalyAudit | null>(
    ['xp-anomaly-audit', me?.role, refreshKey],
    () => apiService.getXpAnomalyAudit(80),
    null,
    { enabled: me?.role === 'SUPERADMIN' },
  );

  const hasIssues = useMemo(() => {
    if (!audit) return false;
    return (
      audit.planFlagMismatches > 0 ||
      audit.mismatchAttempts > 0 ||
      audit.totalOffPlanXpInflated > 0 ||
      audit.affectedUsers > 0
    );
  }, [audit]);

  const runReconcile = async () => {
    if (!window.confirm(t(T.fixHint) + '\n\nDavom etasizmi?')) return;
    setReconciling(true);
    try {
      const res = await apiService.reconcileXpAnomalies();
      setLastFix(res);
      setRefreshKey((k) => k + 1);
    } finally {
      setReconciling(false);
    }
  };

  const userColumns = useMemo(
    () => [
      {
        title: t({ uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' }),
        key: 'user',
        render: (_: unknown, r: XpAnomalyUserRow) => (
          <button
            type="button"
            className="text-left"
            onClick={() => navigate(`/dashboard/employees/${r.userId}`)}
          >
            <div className="font-medium text-blue-600 hover:underline dark:text-blue-400">
              {r.firstName} {r.lastName}
            </div>
            <div className="text-xs text-slate-500">{r.email}</div>
          </button>
        ),
      },
      {
        title: t({ uz: 'Plan bo‘yicha', en: 'In plan', ru: 'По плану' }),
        dataIndex: 'planCorrect',
        key: 'planCorrect',
        width: 110,
      },
      {
        title: t({ uz: 'Plandan tashqari', en: 'Off-plan', ru: 'Вне плана' }),
        dataIndex: 'offPlanCorrect',
        key: 'offPlanCorrect',
        width: 130,
        render: (v: number) => (
          <span className={v > 0 ? 'font-medium text-amber-600' : ''}>{v}</span>
        ),
      },
      {
        title: t({ uz: 'Hozirgi XP', en: 'Current XP', ru: 'Текущий XP' }),
        dataIndex: 'storedXp',
        key: 'storedXp',
        width: 110,
        render: (v: number) => <Tag>{v}</Tag>,
      },
      {
        title: t({ uz: 'Kerakli XP', en: 'Expected XP', ru: 'Нужный XP' }),
        dataIndex: 'expectedXp',
        key: 'expectedXp',
        width: 110,
        render: (v: number) => <Tag color="green">{v}</Tag>,
      },
      {
        title: t({ uz: 'Ayiriladi', en: 'To remove', ru: 'Снять' }),
        dataIndex: 'offPlanXpInflated',
        key: 'offPlanXpInflated',
        width: 100,
        render: (v: number) => (
          <span className={v > 0 ? 'font-semibold text-red-500' : 'text-slate-400'}>
            {v > 0 ? `−${v}` : 0}
          </span>
        ),
      },
    ],
    [navigate, t],
  );

  const sampleColumns = useMemo(
    () => [
      {
        title: t({ uz: 'Vaqt', en: 'When', ru: 'Когда' }),
        dataIndex: 'answeredAt',
        key: 'answeredAt',
        width: 150,
        render: (v: string) =>
          new Date(v).toLocaleString(undefined, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
      },
      {
        title: t({ uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' }),
        key: 'who',
        width: 160,
        render: (_: unknown, r: XpAnomalySample) => (
          <span>
            {r.firstName} {r.lastName}
          </span>
        ),
      },
      {
        title: t({ uz: 'Savol', en: 'Question', ru: 'Вопрос' }),
        dataIndex: 'prompt',
        key: 'prompt',
        ellipsis: true,
      },
      {
        title: 'XP?',
        key: 'xp',
        width: 90,
        render: (_: unknown, r: XpAnomalySample) => (
          <Tag color={r.countsForXp ? 'green' : 'default'}>
            {r.countsForXp ? '+10' : '0'}
          </Tag>
        ),
      },
      {
        title: t({ uz: 'Kerak', en: 'Should', ru: 'Должно' }),
        key: 'should',
        width: 90,
        render: (_: unknown, r: XpAnomalySample) => (
          <Tag color={r.expectedCountsForXp ? 'green' : 'default'}>
            {r.expectedCountsForXp ? '+10' : '0'}
          </Tag>
        ),
      },
      {
        title: t({ uz: 'Sabab', en: 'Reason', ru: 'Причина' }),
        dataIndex: 'reason',
        key: 'reason',
        width: 160,
        render: (v: string) => REASON_LABEL[v] ?? v,
      },
    ],
    [t],
  );

  if (meLoading || !me) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (me.role !== 'SUPERADMIN') {
    return (
      <div className="p-6">
        <Text type="secondary">{t(T.onlySuper)}</Text>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] space-y-6 overflow-y-auto p-6">
      <Card className="!border-slate-200 dark:!border-slate-700/60">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-white">
              <AlertTriangle size={20} className="text-amber-500" />
              {t(T.title)}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              {t(T.subtitle)}
            </p>
            <p className="mt-2 text-xs text-slate-400">{t(T.fixHint)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              icon={<RefreshCw size={16} />}
              onClick={() => setRefreshKey((k) => k + 1)}
              loading={loading}
            >
              {t(T.scan)}
            </Button>
            <Button
              type="primary"
              icon={<Wrench size={16} />}
              onClick={() => void runReconcile()}
              loading={reconciling}
              disabled={!hasIssues && !loading}
            >
              {t(T.fix)}
            </Button>
          </div>
        </div>
      </Card>

      {initialLoading && !audit ? (
        <div className="flex h-40 items-center justify-center">
          <Spin size="large" />
        </div>
      ) : audit ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            <Stat
              label={t({ uz: 'Plan bo‘yicha', en: 'In plan', ru: 'По плану' })}
              value={audit.totalPlanCorrect}
            />
            <Stat
              label={t({
                uz: 'Plandan tashqari',
                en: 'Off-plan',
                ru: 'Вне плана',
              })}
              value={audit.totalOffPlanCorrect}
              warn={audit.totalOffPlanCorrect > 0}
            />
            <Stat
              label={t({ uz: 'Hozirgi XP', en: 'Current XP', ru: 'Текущий XP' })}
              value={audit.totalStoredXp}
            />
            <Stat
              label={t({ uz: 'Kerakli XP', en: 'Expected XP', ru: 'Нужный XP' })}
              value={audit.totalExpectedXp}
            />
            <Stat
              label={t({ uz: 'Ayiriladi', en: 'To remove', ru: 'Снять' })}
              value={
                audit.totalOffPlanXpInflated > 0
                  ? `−${audit.totalOffPlanXpInflated}`
                  : 0
              }
              warn={audit.totalOffPlanXpInflated > 0}
            />
            <Stat
              label={t({ uz: 'Xodimlar', en: 'Users', ru: 'Сотрудники' })}
              value={audit.affectedUsers}
              warn={audit.affectedUsers > 0}
            />
            <Stat
              label={t({ uz: 'Kunlik maqsad', en: 'Daily goal', ru: 'Цель дня' })}
              value={audit.dailyGoalCorrect}
            />
          </div>

          {lastFix ? (
            <Card className="!border-emerald-200 bg-emerald-50/50 dark:!border-emerald-800/50 dark:bg-emerald-950/20">
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                Tuzatildi: plan bayroqlari <b>{lastFix.fixedPlanFlags}</b>, grade{' '}
                <b>{lastFix.fixedGradeAttempts}</b>. XP: {lastFix.beforeStoredXp} →{' '}
                {lastFix.afterExpectedXp} (ayirildi −{lastFix.offPlanXpRemoved}).
              </p>
            </Card>
          ) : null}

          <Card
            className="!border-slate-200 dark:!border-slate-700/60"
            title={t({
              uz: 'Nomuvofiq xodimlar',
              en: 'Affected employees',
              ru: 'Затронутые сотрудники',
            })}
          >
            <Table
              rowKey="userId"
              loading={loading}
              dataSource={audit.users}
              columns={userColumns}
              size="small"
              pagination={{ pageSize: 20 }}
            />
          </Card>

          <Card
            className="!border-slate-200 dark:!border-slate-700/60"
            title={t({
              uz: 'Namuna urinishlar',
              en: 'Sample attempts',
              ru: 'Примеры попыток',
            })}
          >
            <Table
              rowKey="attemptId"
              loading={loading}
              dataSource={audit.samples}
              columns={sampleColumns}
              size="small"
              pagination={{ pageSize: 20 }}
            />
          </Card>
        </>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string | number;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        warn
          ? 'border-amber-300 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/30'
          : 'border-slate-200 bg-card dark:border-slate-700/60'
      }`}
    >
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}
