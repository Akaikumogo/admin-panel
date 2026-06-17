import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Card,
  Col,
  DatePicker,
  Progress,
  Row,
  Select,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  Activity,
  Building2,
  ClipboardCheck,
  LogIn,
  Users,
  UserX,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService, {
  type BranchActivityMatrix,
  type BranchAnalyticsSummary,
  type BranchDailyPlanResult,
  type UserProfile,
} from '@/services/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type DashboardBundle = {
  me: UserProfile | null;
  summary: BranchAnalyticsSummary | null;
  matrix: BranchActivityMatrix | null;
  dailyPlan: BranchDailyPlanResult | null;
};

const KPI = [
  { key: 'totalEmployees', icon: Users, color: '#2563eb' },
  { key: 'firstLoginCount', icon: LogIn, color: '#059669' },
  { key: 'quizTakersCount', icon: ClipboardCheck, color: '#7c3aed' },
  { key: 'activeTodayCount', icon: Activity, color: '#0891b2' },
  { key: 'offlineEmployeesCount', icon: UserX, color: '#dc2626' },
] as const;

const KPI_LABELS: Record<string, { uz: string; en: string; ru: string }> = {
  totalEmployees: { uz: 'Jami xodimlar', en: 'Total employees', ru: 'Всего сотрудников' },
  firstLoginCount: { uz: 'Birinchi login', en: 'First login', ru: 'Первый вход' },
  quizTakersCount: { uz: 'Test yechganlar', en: 'Quiz takers', ru: 'Прошли тест' },
  activeTodayCount: { uz: 'Bugun aktiv', en: 'Active today', ru: 'Активны сегодня' },
  offlineEmployeesCount: { uz: 'Offline (interval)', en: 'Offline (range)', ru: 'Офлайн (период)' },
};

function statusColor(status: 'active' | 'offline' | 'never') {
  if (status === 'active') return '#dcfce7';
  if (status === 'offline') return '#fecaca';
  return '#f1f5f9';
}

export default function BranchAnalyticsPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [orgId, setOrgId] = useState<string>(searchParams.get('orgId') ?? '');

  useEffect(() => {
    const q = searchParams.get('orgId');
    if (q) setOrgId(q);
  }, [searchParams]);
  const [planDate, setPlanDate] = useState<Dayjs>(dayjs());
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(27, 'day'),
    dayjs(),
  ]);

  const from = range[0].format('YYYY-MM-DD');
  const to = range[1].format('YYYY-MM-DD');
  const planDateStr = planDate.format('YYYY-MM-DD');

  const { data, loading } = useFetch<DashboardBundle>(
    ['branch-analytics', orgId, from, to, planDateStr],
    async () => {
      const [me, orgList] = await Promise.all([
        apiService.me(),
        apiService.getOrganizations(),
      ]);
      const effectiveOrgId =
        orgId ||
        (me.role === 'SUPERADMIN'
          ? orgList[0]?.id ?? ''
          : me.organizations?.[0]?.id ?? '');

      if (!effectiveOrgId) {
        return { me, summary: null, matrix: null, dailyPlan: null };
      }

      const [summary, matrix, dailyPlan] = await Promise.all([
        apiService.getBranchAnalyticsSummary({ orgId: effectiveOrgId, from, to }),
        apiService.getBranchActivityMatrix({ orgId: effectiveOrgId, from, to }),
        apiService.getBranchDailyPlanResult({
          orgId: effectiveOrgId,
          date: planDateStr,
        }),
      ]);

      return { me, summary, matrix, dailyPlan };
    },
    { me: null, summary: null, matrix: null, dailyPlan: null },
  );

  const { data: organizations } = useFetch(
    ['organizations-branch-analytics'],
    () => apiService.getOrganizations(),
    [] as { id: string; name: string }[],
  );

  const effectiveOrgId =
    orgId ||
    data.summary?.orgId ||
    (data.me?.role === 'SUPERADMIN' ? '' : data.me?.organizations?.[0]?.id ?? '');

  const matrixColumns = useMemo(() => {
    const days = data.matrix?.days ?? [];
    return [
      {
        title: t({ uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' }),
        dataIndex: 'fullName',
        fixed: 'left' as const,
        width: 180,
      },
      ...days.map((day) => ({
        title: day.slice(5),
        dataIndex: day,
        width: 52,
        align: 'center' as const,
        render: (_: unknown, row: Record<string, unknown>) => {
          const cell = row[day] as
            | { status: 'active' | 'offline' | 'never'; attemptCount: number }
            | undefined;
          if (!cell) return null;
          return (
            <div
              title={`${cell.status}${cell.attemptCount ? ` (${cell.attemptCount})` : ''}`}
              style={{
                background: statusColor(cell.status),
                borderRadius: 4,
                minHeight: 24,
                lineHeight: '24px',
                fontSize: 11,
                fontWeight: cell.status === 'offline' ? 600 : 400,
                color: cell.status === 'offline' ? '#991b1b' : '#334155',
              }}
            >
              {cell.attemptCount > 0 ? cell.attemptCount : '·'}
            </div>
          );
        },
      })),
    ];
  }, [data.matrix?.days, t]);

  const matrixDataSource = useMemo(() => {
    return (data.matrix?.employees ?? []).map((emp) => {
      const row: Record<string, unknown> = {
        key: emp.userId,
        fullName: emp.fullName,
      };
      for (const d of emp.days) {
        row[d.date] = { status: d.status, attemptCount: d.attemptCount };
      }
      return row;
    });
  }, [data.matrix?.employees]);

  if (loading && !data.summary) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-y-auto p-6 h-[calc(100vh-100px)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Title level={3} className="!mb-1">
            {t({
              uz: 'Filial analitikasi',
              en: 'Branch analytics',
              ru: 'Аналитика филиала',
            })}
          </Title>
          <Text type="secondary">
            {t({
              uz: 'Kunlik aktivlik, test natijalari va offline kunlar',
              en: 'Daily activity, quiz results and offline days',
              ru: 'Ежедневная активность, тесты и офлайн-дни',
            })}
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {data.me?.role === 'SUPERADMIN' && (
            <Select
              style={{ minWidth: 260 }}
              placeholder={t({ uz: 'Filial', en: 'Branch', ru: 'Филиал' })}
              value={effectiveOrgId || undefined}
              onChange={(v) => setOrgId(v)}
              options={organizations.map((o) => ({ value: o.id, label: o.name }))}
              suffixIcon={<Building2 size={16} />}
            />
          )}
          <RangePicker
            value={range}
            onChange={(v) => v && setRange(v as [Dayjs, Dayjs])}
            allowClear={false}
          />
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {KPI.map(({ key, icon: Icon, color }) => (
          <Col xs={24} sm={12} lg={8} xl={4} key={key}>
            <Card className="h-full">
              <div className="flex items-start gap-3">
                <div
                  className="rounded-xl p-2 text-white"
                  style={{ background: color }}
                >
                  <Icon size={20} />
                </div>
                <div>
                  <Text type="secondary" className="text-xs">
                    {t(KPI_LABELS[key])}
                  </Text>
                  <div className="text-2xl font-bold">
                    {String(
                      data.summary?.[key as 'totalEmployees' | 'firstLoginCount' | 'quizTakersCount' | 'activeTodayCount' | 'offlineEmployeesCount'] ?? '—',
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title={t({
          uz: 'Kunlik plan va natija',
          en: 'Daily plan & results',
          ru: 'Дневной план и результат',
        })}
        extra={
          <DatePicker
            value={planDate}
            onChange={(d) => d && setPlanDate(d)}
            allowClear={false}
          />
        }
      >
        <div className="mb-4 flex flex-wrap gap-4">
          <Tag color="blue">
            {t({ uz: 'Savollar', en: 'Questions', ru: 'Вопросы' })}:{' '}
            {data.dailyPlan?.questionCount ?? 0} /{' '}
            {data.dailyPlan?.targetQuestions ?? 10}
          </Tag>
          <Tag color="green">
            {t({ uz: 'Bajargan xodimlar', en: 'Completed', ru: 'Выполнили' })}:{' '}
            {data.dailyPlan?.completedEmployees ?? 0} /{' '}
            {data.dailyPlan?.totalEmployees ?? 0}
          </Tag>
        </div>

        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={data.dailyPlan?.questions ?? []}
          scroll={{ x: true }}
          columns={[
            { title: '№', dataIndex: 'orderIndex', width: 48 },
            { title: t({ uz: 'Savol', en: 'Question', ru: 'Вопрос' }), dataIndex: 'prompt' },
            { title: t({ uz: 'Modul', en: 'Module', ru: 'Модуль' }), dataIndex: 'levelTitle', width: 140 },
            { title: t({ uz: 'Nazariya', en: 'Theory', ru: 'Теория' }), dataIndex: 'theoryTitle', width: 140 },
          ]}
        />

        <Title level={5} className="!mt-6 !mb-3">
          {t({ uz: 'Xodimlar natijasi', en: 'Employee results', ru: 'Результаты сотрудников' })}
        </Title>
        <Table
          size="small"
          rowKey="userId"
          dataSource={data.dailyPlan?.userResults ?? []}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: t({ uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' }), dataIndex: 'fullName' },
            { title: t({ uz: 'Javoblar', en: 'Answered', ru: 'Ответы' }), dataIndex: 'answeredCount', width: 90 },
            { title: t({ uz: 'To`g`ri', en: 'Correct', ru: 'Верно' }), dataIndex: 'correctCount', width: 80 },
            {
              title: t({ uz: 'Progress', en: 'Progress', ru: 'Прогресс' }),
              dataIndex: 'completionPercent',
              width: 160,
              render: (v: number, row) => (
                <Progress
                  percent={v}
                  size="small"
                  status={row.completed ? 'success' : 'active'}
                />
              ),
            },
            {
              title: t({ uz: 'Holat', en: 'Status', ru: 'Статус' }),
              dataIndex: 'completed',
              width: 100,
              render: (v: boolean) =>
                v ? (
                  <Tag color="success">{t({ uz: 'Bajarildi', en: 'Done', ru: 'Готово' })}</Tag>
                ) : (
                  <Tag>{t({ uz: 'Jarayonda', en: 'In progress', ru: 'В процессе' })}</Tag>
                ),
            },
          ]}
        />
      </Card>

      <Card
        title={t({
          uz: 'Kunlik aktivlik matritsasi',
          en: 'Daily activity matrix',
          ru: 'Матрица активности',
        })}
        extra={
          <div className="flex gap-2 text-xs">
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded" style={{ background: '#dcfce7' }} />
              {t({ uz: 'Aktiv', en: 'Active', ru: 'Актив' })}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded" style={{ background: '#fecaca' }} />
              {t({ uz: 'Offline', en: 'Offline', ru: 'Офлайн' })}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded" style={{ background: '#f1f5f9' }} />
              {t({ uz: 'Kirmagan', en: 'Never', ru: 'Не входил' })}
            </span>
          </div>
        }
      >
        <Table
          size="small"
          columns={matrixColumns}
          dataSource={matrixDataSource}
          scroll={{ x: Math.max(800, (data.matrix?.days.length ?? 0) * 52 + 200) }}
          pagination={{ pageSize: 15 }}
        />
      </Card>
    </div>
  );
}
