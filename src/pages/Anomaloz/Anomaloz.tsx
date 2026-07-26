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
    uz: 'Xodimlarning bergan javoblari bilan ball (XP) bir-biriga mos keladimi — tekshirish va tuzatish.',
    en: 'Check whether answers match awarded points, then fix mismatches.',
    ru: 'Проверка соответствия ответов и баллов, затем исправление.',
  },
  scan: { uz: 'Tekshirish', en: 'Scan', ru: 'Проверить' },
  fix: {
    uz: 'Hammasini javobiga mos qilish',
    en: 'Reconcile all to answers',
    ru: 'Привести всё к ответам',
  },
  fixHint: {
    uz: 'Tanlangan variantga qarab is_correct va heart_lost ni qayta hisoblaydi. Har bir to‘g‘ri javob = +10 XP.',
    en: 'Recalculates is_correct and heart_lost from the selected option. Each correct = +10 XP.',
    ru: 'Пересчитывает is_correct и heart_lost по выбранному варианту. Каждый верный = +10 XP.',
  },
  onlySuper: {
    uz: 'Faqat SUPERADMIN',
    en: 'SUPERADMIN only',
    ru: 'Только SUPERADMIN',
  },
} as const;

const REASON_LABEL: Record<string, string> = {
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
      audit.mismatchAttempts > 0 ||
      audit.heartLostOnlyMismatches > 0 ||
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
        title: t({ uz: 'Saqlangan XP', en: 'Stored XP', ru: 'Текущий XP' }),
        dataIndex: 'storedXp',
        key: 'storedXp',
        width: 120,
        render: (v: number) => <Tag>{v}</Tag>,
      },
      {
        title: t({ uz: 'Kerakli XP', en: 'Expected XP', ru: 'Ожидаемый XP' }),
        dataIndex: 'expectedXp',
        key: 'expectedXp',
        width: 120,
        render: (v: number) => <Tag color="green">{v}</Tag>,
      },
      {
        title: 'Δ',
        key: 'delta',
        width: 90,
        render: (_: unknown, r: XpAnomalyUserRow) => {
          const d = r.expectedXp - r.storedXp;
          return (
            <span className={d === 0 ? 'text-slate-400' : d > 0 ? 'text-emerald-600' : 'text-red-500'}>
              {d > 0 ? `+${d}` : d}
            </span>
          );
        },
      },
      {
        title: t({ uz: 'Nomuvofiqlik', en: 'Mismatches', ru: 'Расхождения' }),
        dataIndex: 'mismatchCount',
        key: 'mismatchCount',
        width: 110,
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
        width: 180,
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
        title: t({ uz: 'Saqlangan', en: 'Stored', ru: 'Сохранено' }),
        dataIndex: 'storedCorrect',
        key: 'storedCorrect',
        width: 100,
        render: (v: boolean) => (
          <Tag color={v ? 'green' : 'red'}>{v ? 'To‘g‘ri' : 'Xato'}</Tag>
        ),
      },
      {
        title: t({ uz: 'Variant', en: 'Option', ru: 'Вариант' }),
        dataIndex: 'expectedCorrect',
        key: 'expectedCorrect',
        width: 100,
        render: (v: boolean | null) =>
          v === null ? (
            <Tag>—</Tag>
          ) : (
            <Tag color={v ? 'green' : 'red'}>{v ? 'To‘g‘ri' : 'Xato'}</Tag>
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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            <Stat
              label={t({ uz: 'Urinishlar', en: 'Attempts', ru: 'Попытки' })}
              value={audit.scannedAttempts}
            />
            <Stat
              label={t({ uz: 'Nomuvofiq ball', en: 'Grade mismatches', ru: 'Расхождения' })}
              value={audit.mismatchAttempts}
              warn={audit.mismatchAttempts > 0}
            />
            <Stat
              label={t({ uz: 'Xodimlar', en: 'Users', ru: 'Сотрудники' })}
              value={audit.affectedUsers}
              warn={audit.affectedUsers > 0}
            />
            <Stat
              label={t({ uz: 'Saqlangan XP', en: 'Stored XP', ru: 'Текущий XP' })}
              value={audit.totalStoredXp}
            />
            <Stat
              label={t({ uz: 'Kerakli XP', en: 'Expected XP', ru: 'Ожидаемый XP' })}
              value={audit.totalExpectedXp}
            />
            <Stat
              label="Δ XP"
              value={audit.xpDelta > 0 ? `+${audit.xpDelta}` : audit.xpDelta}
              warn={audit.xpDelta !== 0}
            />
          </div>

          {(audit.orphanAttempts > 0 || audit.matchingSkipped > 0) && (
            <Card className="!border-slate-200 dark:!border-slate-700/60">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {audit.orphanAttempts > 0 && (
                  <span className="mr-4">
                    Variant topilmagan / o‘chirilgan: <b>{audit.orphanAttempts}</b> (avto-tuzatilmaydi)
                  </span>
                )}
                {audit.matchingSkipped > 0 && (
                  <span>
                    MATCHING savollar: <b>{audit.matchingSkipped}</b> (skip)
                  </span>
                )}
              </p>
            </Card>
          )}

          {lastFix ? (
            <Card className="!border-emerald-200 dark:!border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20">
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                Tuzatildi: grade <b>{lastFix.fixedGradeAttempts}</b>, heart_lost{' '}
                <b>{lastFix.fixedHeartLostAttempts}</b>. XP: {lastFix.beforeStoredXp} →{' '}
                {lastFix.afterExpectedXp} (Δ {lastFix.xpDelta > 0 ? '+' : ''}
                {lastFix.xpDelta}).
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
