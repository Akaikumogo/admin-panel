import {
  ShieldCheck,
  Users,
  Activity,
  Building2,
  Shield,
  Layers,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Row,
  Col,
  Typography,
  Avatar,
  Skeleton,
  Table,
  Tag,
  Progress
} from 'antd';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type {
  AnalyticsSummary,
  LevelFunnelItem,
  QuestionError,
  UserProfile
} from '@/services/api';

const { Title, Text } = Typography;

const KPI_ICONS = [
  { key: 'totalUsers', icon: Users, color: 'from-blue-500 to-blue-600' },
  {
    key: 'activeUsers7d',
    icon: Activity,
    color: 'from-emerald-500 to-teal-600'
  },
  {
    key: 'totalOrganizations',
    icon: Building2,
    color: 'from-violet-500 to-purple-600'
  },
  {
    key: 'totalModerators',
    icon: Shield,
    color: 'from-amber-500 to-orange-600'
  },
  { key: 'totalLevels', icon: Layers, color: 'from-rose-500 to-pink-600' },
  { key: 'totalQuestions', icon: HelpCircle, color: 'from-cyan-500 to-sky-600' }
] as const;

const KPI_LABELS: Record<string, { uz: string; en: string; ru: string }> = {
  totalUsers: {
    uz: 'Foydalanuvchilar',
    en: 'Total Users',
    ru: 'Пользователей'
  },
  activeUsers7d: { uz: 'Faol (7 kun)', en: 'Active (7d)', ru: 'Активные (7д)' },
  totalOrganizations: {
    uz: 'Tashkilotlar',
    en: 'Organizations',
    ru: 'Организации'
  },
  totalModerators: { uz: 'Moderatorlar', en: 'Moderators', ru: 'Модераторы' },
  totalLevels: { uz: 'Modullar', en: 'Modules', ru: 'Модули' },
  totalQuestions: { uz: 'Savollar', en: 'Questions', ru: 'Вопросы' }
};

export default function HomePage() {
  const { t } = useTranslation();

  // Har bir bo'lim alohida useFetch — biri sekin bo'lsa boshqalari blok bo'lmaydi.
  const { data: me, refetch: refetchMe, initialLoading: meLoading } =
    useFetch<UserProfile | null>(['me'], () => apiService.me(), null);

  const orgIdForAnalytics =
    me?.role === 'SUPERADMIN' ? 'all' : me?.organizations?.[0]?.id ?? 'all';
  const ready = !!me;

  const { data: adminPing } = useFetch<{ message: string } | null>(
    ['admin-ping', me?.role],
    () => (me?.role === 'SUPERADMIN' ? apiService.adminPing() : Promise.resolve(null)),
    null,
  );

  const { data: summary, initialLoading: summaryLoading } =
    useFetch<AnalyticsSummary | null>(
      ['analytics-summary', orgIdForAnalytics],
      () =>
        ready
          ? apiService.getAnalyticsSummary(orgIdForAnalytics)
          : Promise.resolve(null),
      null,
    );

  const { data: funnel, initialLoading: funnelLoading } = useFetch<LevelFunnelItem[]>(
    ['level-funnel', orgIdForAnalytics],
    () =>
      ready
        ? apiService.getLevelFunnel(orgIdForAnalytics)
        : Promise.resolve([] as LevelFunnelItem[]),
    [] as LevelFunnelItem[],
  );

  const { data: errorQuestions, initialLoading: errorsLoading } =
    useFetch<QuestionError[]>(
      ['question-errors', orgIdForAnalytics],
      () =>
        ready
          ? apiService.getQuestionErrors(orgIdForAnalytics)
          : Promise.resolve([] as QuestionError[]),
      [] as QuestionError[],
    );

  const errorColumns = [
    {
      title: t({ uz: 'Savol', en: 'Question', ru: 'Вопрос' }),
      dataIndex: 'prompt',
      key: 'prompt',
      ellipsis: true,
      width: '35%'
    },
    {
      title: t({ uz: 'Modul', en: 'Module', ru: 'Модуль' }),
      dataIndex: 'levelTitle',
      key: 'levelTitle'
    },
    {
      title: t({ uz: 'Nazariya', en: 'Theory', ru: 'Теория' }),
      dataIndex: 'theoryTitle',
      key: 'theoryTitle'
    },
    {
      title: t({ uz: 'Urinishlar', en: 'Attempts', ru: 'Попытки' }),
      dataIndex: 'totalAttempts',
      key: 'totalAttempts',
      width: 100
    },
    {
      title: t({ uz: 'Xatolik %', en: 'Error %', ru: 'Ошибки %' }),
      dataIndex: 'errorRate',
      key: 'errorRate',
      width: 120,
      render: (val: number) => (
        <Tag color={val > 50 ? 'red' : val > 30 ? 'orange' : 'green'}>
          {val}%
        </Tag>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {KPI_ICONS.map(({ key, icon: Icon, color }) => (
          <Card
            key={key}
            className="!border-slate-200 dark:!border-slate-700/60"
            bodyStyle={{ padding: '16px' }}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}
              >
                <Icon size={18} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t(KPI_LABELS[key])}
                </p>
                {summaryLoading ? (
                  <Skeleton.Input active size="small" style={{ width: 60 }} />
                ) : (
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {summary?.[key as keyof AnalyticsSummary] ?? 0}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Row gutter={[16, 16]}>
        {/* Profile Card */}
        <Col xs={24} lg={12}>
          <Card
            className="!border-slate-200 dark:!border-slate-700/60"
            bodyStyle={{ padding: '20px' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <Text className="text-slate-500 dark:text-slate-400 text-sm">
                  {t({ uz: 'Profil', ru: 'Профиль', en: 'Profile' })}
                </Text>
                {meLoading ? (
                  <Skeleton active title={false} paragraph={{ rows: 2 }} />
                ) : (
                  <>
                    <Title level={4} className="!mb-0 !mt-1">
                      {me?.firstName} {me?.lastName}
                    </Title>
                    <Text className="text-slate-500">
                      {me?.email} • {me?.role}
                    </Text>
                  </>
                )}
              </div>
              <Avatar
                size={48}
                style={{ backgroundColor: '#3b82f6' }}
                icon={<ShieldCheck size={24} />}
              />
            </div>
          </Card>
        </Col>

        {/* Permissions Card */}
        <Col xs={24} lg={12}>
          <Card
            className="!border-slate-200 dark:!border-slate-700/60"
            bodyStyle={{ padding: '20px' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <Text className="text-slate-500 dark:text-slate-400 text-sm">
                  {t({
                    uz: 'Permission holati',
                    ru: 'Права доступа',
                    en: 'Permissions'
                  })}
                </Text>
                <div className="mt-2">
                  <Badge
                    color="blue"
                    text={
                      me?.role === 'SUPERADMIN'
                        ? adminPing?.message || 'OK'
                        : 'Limited'
                    }
                    className="text-xs"
                  />
                </div>
              </div>
              {me?.role === 'SUPERADMIN' ? (
                <Button type="primary" onClick={() => refetchMe()}>
                  {t({ uz: 'Yangilash', ru: 'Обновить', en: 'Refresh' })}
                </Button>
              ) : null}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Level Funnel */}
      {(funnelLoading || funnel.length > 0) && (
        <Card
          title={
            <span className="flex items-center gap-2">
              <Layers size={16} />
              {t({
                uz: 'Modul funnel',
                en: 'Module Funnel',
                ru: 'Воронка модулей'
              })}
            </span>
          }
          className="!border-slate-200 dark:!border-slate-700/60"
        >
          {funnelLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
          <div className="space-y-3">
            {funnel.map((item) => {
              const pct =
                item.totalStarted > 0
                  ? Math.round((item.totalCompleted / item.totalStarted) * 100)
                  : 0;
              return (
                <div key={item.levelId} className="flex items-center gap-4">
                  <div className="w-48 truncate font-medium text-sm text-slate-700 dark:text-slate-300">
                    #{item.orderIndex + 1} {item.levelTitle}
                  </div>
                  <Progress
                    percent={pct}
                    size="small"
                    className="flex-1"
                    strokeColor={{ from: '#3b82f6', to: '#06b6d4' }}
                  />
                  <div className="text-xs text-slate-500 dark:text-slate-400 w-28 text-right">
                    {item.totalCompleted}/{item.totalStarted} ({pct}%)
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </Card>
      )}

      {/* Error Questions */}
      {(errorsLoading || errorQuestions.length > 0) && (
        <Card
          title={
            <span className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle size={16} />
              {t({
                uz: 'Eng ko`p xato qilingan savollar',
                en: 'Most Error-Prone Questions',
                ru: 'Вопросы с наибольшим числом ошибок'
              })}
            </span>
          }
          className="!border-slate-200 dark:!border-slate-700/60"
        >
          {errorsLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
            <Table
              dataSource={errorQuestions}
              columns={errorColumns}
              rowKey="questionId"
              pagination={false}
              size="small"
            />
          )}
        </Card>
      )}
    </div>
  );
}
