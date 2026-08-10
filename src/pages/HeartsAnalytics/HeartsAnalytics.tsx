import { useEffect, useMemo, useState } from 'react';
import { Card, Col, Empty, Progress, Row, Select, Spin, Table, Tag } from '@/components/ui';
import { AlertTriangle, HeartPulse, HelpCircle, Users } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type { HeartsLostAnalyticsResponse, Organization, UserProfile } from '@/services/api';
import { formatPersonName } from '@/lib/person-name';

const T = {
  title: { uz: 'Xato javoblar', en: 'Wrong answers', ru: 'Ошибочные ответы' },
  subtitle: {
    uz: 'Noto‘g‘ri javoblar bo‘yicha xodim va savol statistikasi (har urinish 1 energiya sarflaydi)',
    en: 'Wrong-answer stats by user and question (each attempt costs 1 energy)',
    ru: 'Статистика ошибок по пользователям и вопросам (каждая попытка тратит 1 энергию)',
  },
  today: { uz: 'Bugun', en: 'Today', ru: 'Сегодня' },
  month: { uz: '1 oy', en: 'Month', ru: 'Месяц' },
  year: { uz: '1 yil', en: 'Year', ru: 'Год' },
  org: { uz: 'Tashkilot', en: 'Organization', ru: 'Организация' },
  allOrgs: { uz: 'Barcha tashkilotlar', en: 'All organizations', ru: 'Все организации' },
  byUser: { uz: 'Kim qancha xato qildi', en: 'By user', ru: 'По пользователям' },
  byQuestion: { uz: 'Qaysi savollar', en: 'By question', ru: 'По вопросам' },
  totalUsers: { uz: 'Xodimlar', en: 'Users', ru: 'Пользователи' },
  totalQuestions: { uz: 'Savollar', en: 'Questions', ru: 'Вопросы' },
  totalLost: { uz: 'Jami xato javoblar', en: 'Total wrong answers', ru: 'Всего ошибок' },
  empty: {
    uz: 'Tanlangan davrda xato javob yo‘q',
    en: 'No wrong answers in the selected range',
    ru: 'За выбранный период ошибок нет',
  },
} as const;

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="!rounded-2xl !border-slate-200 dark:!border-slate-700/60 h-full">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${color}`}
        >
          <Icon size={22} />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">{label}</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
        </div>
      </div>
    </Card>
  );
}

export default function HeartsAnalyticsPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<'today' | 'month' | 'year'>('today');
  const [orgId, setOrgId] = useState<string>('all');
  const [debouncedOrgId, setDebouncedOrgId] = useState(orgId);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedOrgId(orgId), 300);
    return () => clearTimeout(timer);
  }, [orgId]);

  const { data: me, initialLoading: meLoading } = useFetch<UserProfile | null>(
    ['me'],
    () => apiService.me(),
    null,
  );
  const { data: orgs, initialLoading: orgsLoading } = useFetch(
    ['organizations-for-analytics'],
    () => apiService.getOrganizations(),
    [] as Organization[],
  );

  const isSuperadmin = me?.role === 'SUPERADMIN';
  const ready = !!me && (!isSuperadmin || !orgsLoading);
  const effectiveOrgId = isSuperadmin
    ? debouncedOrgId
    : me?.organizations?.[0]?.id ?? 'all';

  const { data, loading, initialLoading } = useFetch<HeartsLostAnalyticsResponse>(
    ['hearts-lost', range, effectiveOrgId],
    () => apiService.getHeartsLostAnalytics({ range, orgId: effectiveOrgId }),
    { orgId: effectiveOrgId, range: { from: '', to: '' }, byUser: [], byQuestion: [] },
    { enabled: ready },
  );

  const totals = useMemo(() => {
    const userTotal = data.byUser.reduce((sum, row) => sum + row.lostHearts, 0);
    const questionTotal = data.byQuestion.reduce((sum, row) => sum + row.lostHearts, 0);
    return {
      users: data.byUser.length,
      questions: data.byQuestion.length,
      lost: Math.max(userTotal, questionTotal),
    };
  }, [data]);

  const topUser = data.byUser[0];
  const topQuestion = data.byQuestion[0];

  const byUserColumns = useMemo(
    () => [
      {
        title: '#',
        width: 48,
        render: (_: unknown, __: unknown, index: number) => index + 1,
      },
      {
        title: t({ uz: 'Foydalanuvchi', en: 'User', ru: 'Пользователь' }),
        key: 'user',
        render: (_: unknown, r: HeartsLostAnalyticsResponse['byUser'][number]) => (
          <div>
            <div className="font-medium">
              {formatPersonName(r)}
            </div>
            <div className="text-xs text-slate-400">{r.email}</div>
          </div>
        ),
      },
      {
        title: t({ uz: 'Yo‘qotilgan', en: 'Lost', ru: 'Потеряно' }),
        dataIndex: 'lostHearts',
        key: 'lostHearts',
        width: 160,
        render: (v: number) => (
          <div className="flex items-center gap-2">
            <Progress
              percent={totals.lost ? Math.round((v / totals.lost) * 100) : 0}
              size="small"
              showInfo={false}
              strokeColor="#ef4444"
              className="flex-1 max-w-[80px]"
            />
            <Tag color="red">{v}</Tag>
          </div>
        ),
      },
    ],
    [t, totals.lost],
  );

  const byQuestionColumns = useMemo(
    () => [
      {
        title: t({ uz: 'Savol', en: 'Question', ru: 'Вопрос' }),
        dataIndex: 'prompt',
        key: 'prompt',
        ellipsis: true,
      },
      {
        title: t({ uz: 'Modul', en: 'Module', ru: 'Модуль' }),
        dataIndex: 'levelTitle',
        key: 'levelTitle',
        width: 160,
      },
      {
        title: t({ uz: 'Nazariya', en: 'Theory', ru: 'Теория' }),
        dataIndex: 'theoryTitle',
        key: 'theoryTitle',
        width: 160,
      },
      {
        title: t({ uz: 'Yo‘qotilgan', en: 'Lost', ru: 'Потеряно' }),
        dataIndex: 'lostHearts',
        key: 'lostHearts',
        width: 120,
        render: (v: number) => <Tag color="red">{v}</Tag>,
      },
    ],
    [t],
  );

  if (initialLoading || meLoading || !me || (isSuperadmin && orgsLoading)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  const emptyLocale = {
    emptyText: <Empty description={t(T.empty)} image={Empty.PRESENTED_IMAGE_SIMPLE} />,
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HeartPulse size={24} className="text-rose-500" />
            {t(T.title)}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t(T.subtitle)}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={range}
            style={{ width: 160 }}
            onChange={(v) => setRange(v)}
            options={[
              { value: 'today', label: t(T.today) },
              { value: 'month', label: t(T.month) },
              { value: 'year', label: t(T.year) },
            ]}
          />
          {isSuperadmin ? (
            <Select
              value={orgId}
              style={{ width: 320 }}
              onChange={(v) => setOrgId(v)}
              options={[
                { value: 'all', label: t(T.allOrgs) },
                ...orgs.map((o) => ({
                  value: o.id,
                  label: o.isDefault ? `★ ${o.name}` : o.name,
                })),
              ]}
            />
          ) : null}
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <SummaryCard
            icon={Users}
            label={t(T.totalUsers)}
            value={totals.users}
            color="bg-gradient-to-br from-rose-500 to-pink-600"
          />
        </Col>
        <Col xs={24} md={8}>
          <SummaryCard
            icon={HelpCircle}
            label={t(T.totalQuestions)}
            value={totals.questions}
            color="bg-gradient-to-br from-orange-500 to-amber-600"
          />
        </Col>
        <Col xs={24} md={8}>
          <SummaryCard
            icon={AlertTriangle}
            label={t(T.totalLost)}
            value={totals.lost}
            color="bg-gradient-to-br from-red-600 to-rose-700"
          />
        </Col>
      </Row>

      {(topUser || topQuestion) && (
        <Row gutter={[16, 16]}>
          {topUser ? (
            <Col xs={24} lg={12}>
              <Card className="!rounded-2xl !border-rose-100 dark:!border-rose-900/40">
                <div className="text-xs uppercase tracking-wide text-rose-500 mb-2">
                  Top xodim
                </div>
                <div className="font-semibold text-lg">
                  {formatPersonName(topUser)}
                </div>
                <div className="text-sm text-slate-500">{topUser.email}</div>
                <Tag color="red" className="mt-3">
                  {topUser.lostHearts} ta xato javob
                </Tag>
              </Card>
            </Col>
          ) : null}
          {topQuestion ? (
            <Col xs={24} lg={12}>
              <Card className="!rounded-2xl !border-orange-100 dark:!border-orange-900/40">
                <div className="text-xs uppercase tracking-wide text-orange-500 mb-2">
                  Top savol
                </div>
                <div className="font-semibold text-sm leading-relaxed">{topQuestion.prompt}</div>
                <div className="text-xs text-slate-500 mt-2">
                  {topQuestion.levelTitle} • {topQuestion.theoryTitle}
                </div>
                <Tag color="red" className="mt-3">
                  {topQuestion.lostHearts} ta xato javob
                </Tag>
              </Card>
            </Col>
          ) : null}
        </Row>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            className="!rounded-2xl !border-slate-200 dark:!border-slate-700/60"
            title={<span className="font-semibold">{t(T.byUser)}</span>}
          >
            <Table
              rowKey="userId"
              loading={loading}
              dataSource={data.byUser}
              columns={byUserColumns}
              pagination={{ pageSize: 8, hideOnSinglePage: true }}
              size="middle"
              locale={emptyLocale}
            />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card
            className="!rounded-2xl !border-slate-200 dark:!border-slate-700/60"
            title={<span className="font-semibold">{t(T.byQuestion)}</span>}
          >
            <Table
              rowKey="questionId"
              loading={loading}
              dataSource={data.byQuestion}
              columns={byQuestionColumns}
              pagination={{ pageSize: 8, hideOnSinglePage: true }}
              size="middle"
              locale={emptyLocale}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
