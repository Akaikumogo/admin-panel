import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, Segmented, Select, Tabs, Spin, Table, Tag, DatePicker, Row, Col, Progress, message } from '@/components/ui';
import dayjs, { type Dayjs } from 'dayjs';
import {
  Activity,
  Clock,
  TrendingUp,
  Users as UsersIcon,
  Building2,
  LogIn,
  ClipboardCheck,
  UserX,
  BarChart3,
  CalendarDays,
  Target,
  Trophy,
  Download,
} from 'lucide-react';
import {
  userActivityApi,
  apiService,
  type ActivityGroup,
  type ActivityRange,
  type ActivityStats,
  type ActivityUserRow,
  type QuestionStatsRow,
  type Organization,
  type BranchActivityMatrix,
  type BranchAnalyticsSummary,
  type BranchDailyPlanResult,
  type BranchMonthlyProgress,
  type BranchComparison,
} from '@/services/api';
import { userActivitySocket } from '@/services/userActivitySocket';
import { useFetch } from '@/hooks/useFetch';
import ActivityTable from './ActivityTable';
import QuestionStatsPanel from './QuestionStatsPanel';
import UserTimelineDrawer from './UserTimelineDrawer';
import EmployeeAttemptsDrawer from './EmployeeAttemptsDrawer';

const RANGE_OPTIONS: { label: string; value: ActivityRange }[] = [
  { label: 'Bugun', value: 'day' },
  { label: 'Hafta', value: 'week' },
  { label: 'Oy', value: 'month' },
  { label: 'Yil', value: 'year' },
];

const formatDuration = (sec: number): string => {
  if (!sec || sec < 60) return `${sec || 0}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}s ${m}m`;
  return `${m}m`;
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  hint,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
  color: string;
}) => (
  <Card className="!rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
    <div className="flex items-start gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${color}`}
      >
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
          {label}
        </div>
        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
          {value}
        </div>
        {hint && (
          <div className="text-xs text-slate-400 mt-1 truncate" title={hint}>
            {hint}
          </div>
        )}
      </div>
    </div>
  </Card>
);

type ActivityTab = ActivityGroup | 'branchKpi';

const UserActivity = () => {
  const [searchParams] = useSearchParams();
  const initialOrg = searchParams.get('orgId') ?? 'all';
  const [activeTab, setActiveTab] = useState<ActivityTab>('employees');
  const [group, setGroup] = useState<ActivityGroup>('employees');
  const [range, setRange] = useState<ActivityRange>('day');
  const [orgFilter, setOrgFilter] = useState<string>(initialOrg);
  const [onlineFilter, setOnlineFilter] = useState<'all' | 'online' | 'offline'>(
    'all',
  );
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [attemptsUser, setAttemptsUser] = useState<{
    userId: string;
    fullName: string;
  } | null>(null);
  const [liveStatus, setLiveStatus] = useState<Record<string, boolean>>({});

  const { data: organizations } = useFetch(
    ['organizations'],
    () => apiService.getOrganizations(),
    [] as Organization[],
  );

  const orgSelectOptions = useMemo(
    () => [
      { value: 'all', label: 'Barcha filiallar' },
      ...organizations.map((o) => ({
        value: o.id,
        label: o.isDefault ? `★ ${o.name}` : o.name,
      })),
    ],
    [organizations],
  );

  const branchOrgSelectOptions = useMemo(
    () =>
      organizations.map((o) => ({
        value: o.id,
        label: o.isDefault ? `★ ${o.name}` : o.name,
      })),
    [organizations],
  );

  const { data: stats, refetch: refetchStats } = useFetch<ActivityStats | null>(
    ['ua-stats', group, range, orgFilter],
    () =>
      userActivityApi.stats({
        group,
        range,
        organizationId: orgFilter === 'all' ? undefined : orgFilter,
      }),
    null,
  );

  const {
    data: users,
    loading: usersLoading,
    refetch: refetchUsers,
  } = useFetch<ActivityUserRow[]>(
    ['ua-users', group, range, orgFilter],
    () =>
      userActivityApi.listUsers({
        group,
        range,
        organizationId: orgFilter === 'all' ? undefined : orgFilter,
      }),
    [] as ActivityUserRow[],
  );

  const { data: questionStats } = useFetch<QuestionStatsRow[]>(
    ['ua-question-stats', orgFilter],
    () =>
      userActivityApi.questionStats({
        organizationId: orgFilter === 'all' ? undefined : orgFilter,
      }),
    [] as QuestionStatsRow[],
  );

  // Branch analytics — filial KPI, matritsa, kunlik plan
  const [planDate, setPlanDate] = useState<Dayjs>(dayjs());
  const [branchRange, setBranchRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(27, 'day'),
    dayjs(),
  ]);
  // Filial KPI tab — alohida filial tanlagich (bo'sh bo'lsa top filter/default ga tushadi)
  const [branchOrgId, setBranchOrgId] = useState<string>('');
  const branchFrom = branchRange[0].format('YYYY-MM-DD');
  const branchTo = branchRange[1].format('YYYY-MM-DD');
  const planDateStr = planDate.format('YYYY-MM-DD');

  const effectiveBranchOrgId = useMemo(() => {
    if (branchOrgId) return branchOrgId;
    if (orgFilter !== 'all') return orgFilter;
    const main = organizations.find((o) => o.isDefault);
    return main?.id ?? organizations[0]?.id ?? '';
  }, [branchOrgId, orgFilter, organizations]);

  const selectedBranchName = useMemo(
    () => organizations.find((o) => o.id === effectiveBranchOrgId)?.name ?? '',
    [organizations, effectiveBranchOrgId],
  );

  const { data: branchSummary } = useFetch<BranchAnalyticsSummary | null>(
    ['branch-summary', effectiveBranchOrgId, branchFrom, branchTo],
    () =>
      apiService.getBranchAnalyticsSummary({
        orgId: effectiveBranchOrgId,
        from: branchFrom,
        to: branchTo,
      }),
    null,
    { enabled: !!effectiveBranchOrgId },
  );

  const { data: branchMatrix } = useFetch<BranchActivityMatrix | null>(
    ['branch-matrix', effectiveBranchOrgId, branchFrom, branchTo],
    () =>
      apiService.getBranchActivityMatrix({
        orgId: effectiveBranchOrgId,
        from: branchFrom,
        to: branchTo,
      }),
    null,
    { enabled: !!effectiveBranchOrgId },
  );

  const { data: dailyPlan } = useFetch<BranchDailyPlanResult | null>(
    ['branch-daily-plan', effectiveBranchOrgId, planDateStr],
    () =>
      apiService.getBranchDailyPlanResult({
        orgId: effectiveBranchOrgId,
        date: planDateStr,
      }),
    null,
    { enabled: !!effectiveBranchOrgId },
  );

  // Oylik progress: bajarilgan kunlar / oy kunlari
  const [progressMonth, setProgressMonth] = useState<Dayjs>(dayjs());
  const monthStr = progressMonth.format('YYYY-MM');
  const [exporting, setExporting] = useState(false);

  const { data: monthlyProgress } = useFetch<BranchMonthlyProgress | null>(
    ['branch-monthly-progress', effectiveBranchOrgId, monthStr],
    () =>
      apiService.getBranchMonthlyProgress({
        orgId: effectiveBranchOrgId,
        month: monthStr,
      }),
    null,
    { enabled: !!effectiveBranchOrgId },
  );

  const { data: branchComparison } = useFetch<BranchComparison | null>(
    ['branch-comparison', monthStr],
    () => apiService.getBranchComparison({ month: monthStr }),
    null,
  );

  const handleExportMonthly = async () => {
    if (!effectiveBranchOrgId) return;
    setExporting(true);
    try {
      const orgName = (monthlyProgress?.orgName ?? selectedBranchName ?? 'filial')
        .replace(/\s+/g, '_');
      await apiService.downloadBranchMonthlyProgressExcel({
        orgId: effectiveBranchOrgId,
        month: monthStr,
        filename: `${monthStr}_${orgName}.xlsx`,
      });
    } catch {
      message.error('Excel yuklab olishda xatolik');
    } finally {
      setExporting(false);
    }
  };

  const branchKpiItems: Array<{
    key: keyof BranchAnalyticsSummary;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
  }> = [
    { key: 'totalEmployees', label: 'Jami xodimlar', icon: UsersIcon, color: 'bg-blue-500' },
    { key: 'firstLoginCount', label: 'Birinchi login', icon: LogIn, color: 'bg-emerald-500' },
    { key: 'quizTakersCount', label: 'Test yechganlar', icon: ClipboardCheck, color: 'bg-violet-500' },
    { key: 'activeTodayCount', label: 'Bugun aktiv', icon: Activity, color: 'bg-cyan-500' },
    { key: 'offlineEmployeesCount', label: 'Offline (interval)', icon: UserX, color: 'bg-rose-500' },
    {
      key: 'planCompletedTodayCount',
      label: 'Bugun plan bajarganlar (10 to‘g‘ri)',
      icon: Target,
      color: 'bg-emerald-600',
    },
  ];

  const statusBg = (s: 'active' | 'offline' | 'never') =>
    s === 'active' ? '#dcfce7' : s === 'offline' ? '#fecaca' : '#f1f5f9';

  const matrixDays = branchMatrix?.days ?? [];
  const matrixColumns = useMemo(
    () => [
      {
        title: 'Xodim',
        dataIndex: 'fullName',
        fixed: 'left' as const,
        width: 180,
      },
      ...matrixDays.map((day) => ({
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
                background: statusBg(cell.status),
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
    ],
    [matrixDays],
  );

  const matrixDataSource = useMemo(
    () =>
      (branchMatrix?.employees ?? []).map((emp) => {
        const row: Record<string, unknown> = {
          key: emp.userId,
          fullName: emp.fullName,
        };
        for (const d of emp.days) {
          row[d.date] = { status: d.status, attemptCount: d.attemptCount };
        }
        return row;
      }),
    [branchMatrix?.employees],
  );

  // Real-time: WS dan kelgan online/offline statusni state ga yozamiz
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    userActivitySocket.connect(token);
    const off = userActivitySocket.onStatus((e) => {
      setLiveStatus((prev) => ({
        ...prev,
        [e.userId]: e.status === 'online',
      }));
      // Stat cards refresh — debounce: 3 sekunddan keyin
    });
    return () => {
      off();
    };
  }, []);

  // Har 60 sekundda stat va list ni yangilash (backup polling)
  useEffect(() => {
    const id = setInterval(() => {
      refetchStats();
      refetchUsers();
    }, 60_000);
    return () => clearInterval(id);
  }, [refetchStats, refetchUsers]);

  const enrichedUsers = useMemo<ActivityUserRow[]>(() => {
    return users.map((u) =>
      liveStatus[u.userId] !== undefined
        ? { ...u, isOnline: liveStatus[u.userId] }
        : u,
    );
  }, [users, liveStatus]);

  const filteredUsers = useMemo(() => {
    if (onlineFilter === 'all') return enrichedUsers;
    return enrichedUsers.filter((u) =>
      onlineFilter === 'online' ? u.isOnline : !u.isOnline,
    );
  }, [enrichedUsers, onlineFilter]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Foydalanuvchilar aktivligi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time online status, kunlik/haftalik/oylik activity va savol
            xatolari
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Segmented
            value={range}
            onChange={(v) => setRange(v as ActivityRange)}
            options={RANGE_OPTIONS}
          />
          <Select
            value={orgFilter}
            onChange={setOrgFilter}
            showSearch
            className="!min-w-[200px]"
            options={orgSelectOptions}
          />
          <Select
            value={onlineFilter}
            onChange={setOnlineFilter}
            className="!min-w-[140px]"
            options={[
              { value: 'all', label: 'Hammasi' },
              { value: 'online', label: 'Online' },
              { value: 'offline', label: 'Offline' },
            ]}
          />
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          label="Hozir online"
          value={stats?.onlineNow ?? 0}
          color="bg-emerald-500"
        />
        <StatCard
          icon={UsersIcon}
          label="Bugun kirganlar"
          value={stats?.loginsToday ?? 0}
          color="bg-blue-500"
        />
        <StatCard
          icon={Clock}
          label="O'rtacha online (min)"
          value={stats?.avgOnlineMinutes ?? 0}
          color="bg-violet-500"
        />
        <StatCard
          icon={Building2}
          label="Eng aktiv filial"
          value={stats?.topBranch?.name ?? '—'}
          hint={
            stats?.topBranch
              ? `${stats.topBranch.loginCount} ta login bugun`
              : undefined
          }
          color="bg-amber-500"
        />
      </div>

      {/* TABS */}
      <Tabs
        activeKey={activeTab}
        onChange={(k) => {
          const tab = k as ActivityTab;
          setActiveTab(tab);
          if (tab === 'employees' || tab === 'moderators') {
            setGroup(tab);
          }
        }}
        items={[
          {
            key: 'employees',
            label: (
              <span className="flex items-center gap-2">
                <UsersIcon size={16} /> Filial xodimlari
              </span>
            ),
            children: (
              <Spin spinning={usersLoading}>
                <ActivityTable
                  rows={filteredUsers}
                  onOpenUser={setDrawerUserId}
                  formatDuration={formatDuration}
                />
              </Spin>
            ),
          },
          {
            key: 'moderators',
            label: (
              <span className="flex items-center gap-2">
                <TrendingUp size={16} /> Moderatorlar
              </span>
            ),
            children: (
              <Spin spinning={usersLoading}>
                <ActivityTable
                  rows={filteredUsers}
                  onOpenUser={setDrawerUserId}
                  formatDuration={formatDuration}
                />
              </Spin>
            ),
          },
          {
            key: 'branchKpi',
            label: (
              <span className="flex items-center gap-2">
                <BarChart3 size={16} /> Filial KPI
              </span>
            ),
            children: (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Filial:
                    </span>
                    <Select
                      value={effectiveBranchOrgId || undefined}
                      onChange={setBranchOrgId}
                      placeholder="Filial tanlang"
                      showSearch
                      optionFilterProp="label"
                      className="!min-w-[240px]"
                      options={branchOrgSelectOptions}
                    />
                  </div>
                  <DatePicker.RangePicker
                    value={branchRange}
                    onChange={(v) => v && setBranchRange(v as [Dayjs, Dayjs])}
                    allowClear={false}
                  />
                </div>
                <Row gutter={[16, 16]}>
                  {branchKpiItems.map(({ key, label, icon: Icon, color }) => (
                    <Col xs={24} sm={12} lg={8} xl={6} key={String(key)}>
                      <Card className="!rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center text-white ${color}`}
                          >
                            <Icon size={20} />
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-1">{label}</div>
                            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                              {String(branchSummary?.[key] ?? '—')}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>

                <Card
                  className="!rounded-2xl"
                  title={
                    <span className="flex items-center gap-2">
                      <CalendarDays size={16} /> Kunlik plan va natija
                    </span>
                  }
                  extra={
                    <DatePicker
                      value={planDate}
                      onChange={(d) => d && setPlanDate(d)}
                      allowClear={false}
                    />
                  }
                >
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Tag color="gold">
                      Kunlik maqsad: {dailyPlan?.dailyGoalCorrect ?? 10} ta
                      to‘g‘ri javob
                    </Tag>
                    <Tag color="blue">
                      Savollar har xodimga lavozimi bo‘yicha random beriladi
                    </Tag>
                    <Tag color="green">
                      Bajargan xodimlar: {dailyPlan?.completedEmployees ?? 0} /{' '}
                      {dailyPlan?.totalEmployees ?? 0}
                    </Tag>
                  </div>
                  <div className="font-semibold mb-1">
                    Xodimlar natijasi (progress = to‘g‘ri javoblar /{' '}
                    {dailyPlan?.dailyGoalCorrect ?? 10})
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Xodim qatorini bosing — barcha javoblari (audit) ochiladi
                  </p>
                  <Table
                    size="small"
                    rowKey="userId"
                    dataSource={dailyPlan?.userResults ?? []}
                    pagination={{ pageSize: 10 }}
                    onRow={(row) => ({
                      onClick: () =>
                        setAttemptsUser({
                          userId: row.userId,
                          fullName: row.fullName,
                        }),
                      style: { cursor: 'pointer' },
                    })}
                    columns={[
                      { title: 'Xodim', dataIndex: 'fullName' },
                      { title: 'Javoblar', dataIndex: 'answeredCount', width: 90 },
                      { title: 'To`g`ri', dataIndex: 'correctCount', width: 80 },
                      {
                        title: 'Plandan tashqari',
                        dataIndex: 'extraCorrectCount',
                        width: 110,
                        render: (v: number) =>
                          v > 0 ? <Tag color="purple">+{v}</Tag> : '—',
                      },
                      {
                        title: 'Progress',
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
                        title: 'Holat',
                        dataIndex: 'completed',
                        width: 100,
                        render: (v: boolean) =>
                          v ? (
                            <Tag color="success">Bajarildi</Tag>
                          ) : (
                            <Tag>Jarayonda</Tag>
                          ),
                      },
                    ]}
                  />
                </Card>

                <Card
                  className="!rounded-2xl"
                  title={
                    <span className="flex items-center gap-2">
                      <TrendingUp size={16} /> Oylik progress — bajarilgan
                      kunlar / oy kunlari
                    </span>
                  }
                  extra={
                    <div className="flex items-center gap-2">
                      <DatePicker
                        picker="month"
                        value={progressMonth}
                        onChange={(d) => d && setProgressMonth(d)}
                        allowClear={false}
                      />
                      <Button
                        icon={<Download size={14} />}
                        loading={exporting}
                        onClick={handleExportMonthly}
                      >
                        Excel
                      </Button>
                    </div>
                  }
                >
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Tag color="blue">
                      Oy: {monthlyProgress?.month ?? monthStr} (
                      {monthlyProgress?.daysInMonth ?? '—'} kun)
                    </Tag>
                    <Tag color="purple">
                      O‘rtacha progress:{' '}
                      {monthlyProgress?.averageMonthlyPercent ?? 0}%
                    </Tag>
                    <Tag color="green">
                      To‘liq bajarganlar:{' '}
                      {monthlyProgress?.fullCompletedEmployees ?? 0} /{' '}
                      {monthlyProgress?.totalEmployees ?? 0}
                    </Tag>
                  </div>
                  <Table
                    size="small"
                    rowKey="userId"
                    dataSource={monthlyProgress?.employees ?? []}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: true }}
                    columns={[
                      { title: 'Xodim', dataIndex: 'fullName' },
                      {
                        title: 'Bajarilgan kunlar',
                        dataIndex: 'daysCompleted',
                        width: 140,
                        render: (v: number) =>
                          `${v} / ${monthlyProgress?.daysInMonth ?? '—'}`,
                      },
                      {
                        title: 'Oylik progress',
                        dataIndex: 'monthlyPercent',
                        width: 180,
                        sorter: (
                          a: { monthlyPercent: number },
                          b: { monthlyPercent: number },
                        ) => a.monthlyPercent - b.monthlyPercent,
                        render: (v: number) => (
                          <Progress
                            percent={v}
                            size="small"
                            status={v >= 100 ? 'success' : 'active'}
                          />
                        ),
                      },
                      { title: 'To`g`ri', dataIndex: 'correctTotal', width: 80 },
                      { title: 'Xato', dataIndex: 'wrongTotal', width: 70 },
                      {
                        title: 'Oxirgi faollik',
                        dataIndex: 'lastActiveAt',
                        width: 150,
                        render: (v: string | null) =>
                          v ? dayjs(v).format('DD.MM.YYYY HH:mm') : '—',
                      },
                    ]}
                  />
                </Card>

                <Card
                  className="!rounded-2xl"
                  title={
                    <span className="flex items-center gap-2">
                      <Trophy size={16} /> Filiallar reytingi —{' '}
                      {branchComparison?.month ?? monthStr}
                    </span>
                  }
                >
                  <Table
                    size="small"
                    rowKey="orgId"
                    dataSource={branchComparison?.branches ?? []}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      {
                        title: '№',
                        dataIndex: 'rank',
                        width: 60,
                        render: (v: number) =>
                          v === 1 ? '🥇' : v === 2 ? '🥈' : v === 3 ? '🥉' : v,
                      },
                      {
                        title: 'Filial',
                        dataIndex: 'orgName',
                        render: (
                          v: string,
                          row: { isDefault: boolean; orgId: string },
                        ) => (
                          <span
                            className={
                              row.orgId === effectiveBranchOrgId
                                ? 'font-semibold'
                                : ''
                            }
                          >
                            {row.isDefault ? `★ ${v}` : v}
                          </span>
                        ),
                      },
                      {
                        title: 'Xodimlar',
                        dataIndex: 'totalEmployees',
                        width: 100,
                      },
                      {
                        title: 'Bajarilgan kunlar',
                        dataIndex: 'completedDays',
                        width: 140,
                      },
                      {
                        title: 'O‘rtacha oylik %',
                        dataIndex: 'averageMonthlyPercent',
                        width: 200,
                        render: (v: number) => (
                          <Progress percent={v} size="small" />
                        ),
                      },
                    ]}
                  />
                </Card>

                <Card
                  className="!rounded-2xl"
                  title={
                    <span>
                      Kunlik aktivlik matritsasi
                      {selectedBranchName ? ` — ${selectedBranchName}` : ''}
                    </span>
                  }
                  extra={
                    <div className="flex gap-2 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="h-3 w-3 rounded"
                          style={{ background: '#dcfce7' }}
                        />
                        Aktiv
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="h-3 w-3 rounded"
                          style={{ background: '#fecaca' }}
                        />
                        Offline
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="h-3 w-3 rounded"
                          style={{ background: '#f1f5f9' }}
                        />
                        Kirmagan
                      </span>
                    </div>
                  }
                >
                  <Table
                    size="small"
                    columns={matrixColumns}
                    dataSource={matrixDataSource}
                    scroll={{
                      x: Math.max(800, matrixDays.length * 52 + 200),
                    }}
                    pagination={{ pageSize: 15 }}
                  />
                </Card>
              </div>
            ),
          },
        ]}
      />

      {/* QUESTION STATS — eng ko'p xato qilingan savollar */}
      <QuestionStatsPanel rows={questionStats} />

      {/* User detail drawer */}
      <UserTimelineDrawer
        userId={drawerUserId}
        onClose={() => setDrawerUserId(null)}
      />

      {/* Xodim javoblari auditi (kunlik plan) */}
      <EmployeeAttemptsDrawer
        orgId={effectiveBranchOrgId}
        userId={attemptsUser?.userId ?? null}
        fullName={attemptsUser?.fullName ?? ''}
        initialDate={planDateStr}
        onClose={() => setAttemptsUser(null)}
      />
    </div>
  );
};

export default UserActivity;
