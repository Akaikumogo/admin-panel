import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Avatar, Button, Progress, Segmented, Spin, Table, Tag, Tooltip, DatePicker, Skeleton } from '@/components/ui';
import { ArrowLeft, CheckCircle2, Zap, Trophy, XCircle, Mail, Calendar, CalendarDays } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import NoData from '@/components/NoData';
import apiService, { BACKEND_ORIGIN } from '@/services/api';
import type {
  StudentDetail as StudentDetailType,
  StudentXpHistoryResponse,
  LostQuestion,
  ActivityDay,
  MonthlyPlanMatrix,
  YearlyPlanMatrix,
} from '@/services/api';
import { PlanMatrixTable, type PlanPeriod } from '@/pages/Reports/PlanMatrixTable';
import { todayStr } from '@/pages/Analytics/analytics-utils';
import dayjs from 'dayjs';

const T = {
  back: { uz: 'Orqaga', en: 'Back', ru: 'Назад' },
  profile: { uz: 'Profil', en: 'Profile', ru: 'Профиль' },
  progress: { uz: 'Progress', en: 'Progress', ru: 'Прогресс' },
  lostQuestions: { uz: 'Ko`p xato qilingan savollar', en: 'Most failed questions', ru: 'Часто ошибаемые вопросы' },
  activity: { uz: 'Faollik (28 kun)', en: 'Activity (28 days)', ru: 'Активность (28 дней)' },
  totalXp: { uz: 'Jami XP', en: 'Total XP', ru: 'Всего XP' },
  correctAnswers: { uz: 'To‘g‘ri javoblar', en: 'Correct answers', ru: 'Верные ответы' },
  uniqueQuestions: { uz: 'Noyob savollar', en: 'Unique questions', ru: 'Уникальные вопросы' },
  completedLevels: { uz: 'Tugallangan darajalar', en: 'Completed levels', ru: 'Завершённые уровни' },
  totalErrors: { uz: 'Jami xatolar', en: 'Total errors', ru: 'Всего ошибок' },
  xpHistory: { uz: 'XP tarixi', en: 'XP history', ru: 'История XP' },
  xpHistoryHint: {
    uz: 'Qachon, qaysi savoldan ball olgani. Ball faqat kunlik majburiyat (plan) uchun; plandan tashqari = +0.',
    en: 'When and which question earned points. Points only for daily plan; off-plan = +0.',
    ru: 'Когда и за какой вопрос начислены баллы. Баллы только за дневной план; вне плана = +0.',
  },
  when: { uz: 'Vaqt', en: 'When', ru: 'Когда' },
  xp: { uz: 'Ball', en: 'XP', ru: 'Баллы' },
  question: { uz: 'Savol', en: 'Question', ru: 'Вопрос' },
  level: { uz: 'Daraja', en: 'Level', ru: 'Уровень' },
  theory: { uz: 'Nazariya', en: 'Theory', ru: 'Теория' },
  wrongCount: { uz: 'Xatolar', en: 'Errors', ru: 'Ошибки' },
  attempts: { uz: 'Urinishlar', en: 'Attempts', ru: 'Попытки' },
  noLostQuestions: { uz: 'Xato qilingan savollar yo`q', en: 'No failed questions', ru: 'Нет ошибочных вопросов' },
  noXpHistory: { uz: 'Hali XP tarixi yo‘q', en: 'No XP history yet', ru: 'Истории XP пока нет' },
  organizations: { uz: 'Tashkilotlar', en: 'Organizations', ru: 'Организации' },
  joined: { uz: 'Qo`shilgan', en: 'Joined', ru: 'Зарегистрирован' },
} as const;

const ACTIVITY_COLORS = [
  'bg-slate-100 dark:bg-slate-800',
  'bg-green-200 dark:bg-green-900',
  'bg-green-400 dark:bg-green-700',
  'bg-green-600 dark:bg-green-500',
  'bg-green-800 dark:bg-green-400',
];

function getActivityColor(count: number) {
  if (count === 0) return ACTIVITY_COLORS[0];
  if (count <= 3) return ACTIVITY_COLORS[1];
  if (count <= 7) return ACTIVITY_COLORS[2];
  if (count <= 15) return ACTIVITY_COLORS[3];
  return ACTIVITY_COLORS[4];
}

const StudentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [xpPage, setXpPage] = useState(1);
  const [planPeriod, setPlanPeriod] = useState<PlanPeriod>('monthly');
  const [planMonth, setPlanMonth] = useState(todayStr().slice(0, 7));
  const [planYear, setPlanYear] = useState(todayStr().slice(0, 4));

  const { data: student, initialLoading } = useFetch<StudentDetailType | null>(
    ['student-detail', id],
    () => apiService.getStudent(id!),
    null,
  );

  const studentOrgId = student?.organizations?.[0]?.id;

  const emptyMatrix: MonthlyPlanMatrix = {
    orgId: '',
    orgName: '',
    month: planMonth,
    daysInMonth: 30,
    dailyGoalCorrect: 10,
    days: [],
    totalEmployees: 0,
    averageMonthlyPercent: 0,
    fullCompletedEmployees: 0,
    employees: [],
  };

  const emptyYearMatrix: YearlyPlanMatrix = {
    orgId: '',
    orgName: '',
    year: planYear,
    months: [],
    dailyGoalCorrect: 10,
    totalEmployees: 0,
    averageYearlyPercent: 0,
    employees: [],
  };

  const { data: studentPlanMatrix, initialLoading: planLoading } =
    useFetch<MonthlyPlanMatrix>(
      ['student-plan-matrix', id, studentOrgId, planMonth],
      () =>
        apiService.getMonthlyPlanMatrix({
          orgId: studentOrgId,
          month: planMonth,
        }),
      emptyMatrix,
      { enabled: !!id && !!studentOrgId && planPeriod !== 'yearly' },
    );

  const { data: studentYearMatrix, initialLoading: yearPlanLoading } =
    useFetch<YearlyPlanMatrix>(
      ['student-year-matrix', id, studentOrgId, planYear],
      () =>
        apiService.getYearlyPlanMatrix({
          orgId: studentOrgId,
          year: planYear,
        }),
      emptyYearMatrix,
      { enabled: !!id && !!studentOrgId && planPeriod === 'yearly' },
    );

  const { data: xpHistory, initialLoading: xpLoading } = useFetch<StudentXpHistoryResponse | null>(
    ['student-xp-history', id, xpPage],
    () => apiService.getStudentXpHistory(id!, { page: xpPage, limit: 30 }),
    null,
  );

  const { data: lostQuestions, initialLoading: lqLoading } = useFetch<LostQuestion[]>(
    ['student-lost-questions', id],
    () => apiService.getStudentLostQuestions(id!),
    [],
  );

  const { data: activity, initialLoading: actLoading } = useFetch<ActivityDay[]>(
    ['student-activity', id],
    () => apiService.getStudentActivity(id!),
    [],
  );

  useEffect(() => {
    setXpPage(1);
  }, [id]);

  if (initialLoading || !student) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spin size="large" />
      </div>
    );
  }

  const lostColumns = [
    {
      title: t(T.question),
      dataIndex: 'prompt',
      key: 'prompt',
      ellipsis: true,
    },
    {
      title: t(T.level),
      dataIndex: 'levelTitle',
      key: 'levelTitle',
      width: 160,
    },
    {
      title: t(T.theory),
      dataIndex: 'theoryTitle',
      key: 'theoryTitle',
      width: 160,
    },
    {
      title: t(T.wrongCount),
      dataIndex: 'wrongCount',
      key: 'wrongCount',
      width: 100,
      render: (v: number) => <span className="text-red-500 font-medium">{v}</span>,
    },
    {
      title: t(T.attempts),
      dataIndex: 'totalAttempts',
      key: 'totalAttempts',
      width: 100,
    },
  ];

  const xpColumns = [
    {
      title: t(T.when),
      dataIndex: 'answeredAt',
      key: 'answeredAt',
      width: 160,
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
      title: t(T.question),
      dataIndex: 'prompt',
      key: 'prompt',
      ellipsis: true,
    },
    {
      title: t(T.level),
      dataIndex: 'levelTitle',
      key: 'levelTitle',
      width: 140,
    },
    {
      title: t(T.theory),
      dataIndex: 'theoryTitle',
      key: 'theoryTitle',
      width: 140,
    },
    {
      title: t(T.xp),
      dataIndex: 'xpEarned',
      key: 'xpEarned',
      width: 90,
      render: (v: number) =>
        v > 0 ? <Tag color="green">+{v}</Tag> : <Tag>0</Tag>,
    },
  ];

  return (
    <div className="space-y-6">
      <Button
        type="text"
        icon={<ArrowLeft size={16} />}
        onClick={() => navigate(-1)}
        className="!px-2"
      >
        {t(T.back)}
      </Button>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-start gap-5">
          <Avatar
            size={72}
            src={student.avatarUrl ? `${BACKEND_ORIGIN}${student.avatarUrl}` : undefined}
            className="bg-gradient-to-br from-blue-500 to-blue-700 flex-shrink-0 text-2xl"
          >
            {(student.firstName?.[0] || '') + (student.lastName?.[0] || '')}
          </Avatar>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {student.firstName} {student.lastName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                {'⚡'.repeat(student.badge.bolts)} {student.badge.label}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><Mail size={14} /> {student.email}</span>
              <span className="flex items-center gap-1">
                <Calendar size={14} /> {t(T.joined)}: {new Date(student.createdAt).toLocaleDateString()}
              </span>
            </div>
            {student.organizations.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-400">{t(T.organizations)}:</span>
                {student.organizations.map((o) => (
                  <Tag key={o.id}>{o.name}</Tag>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-6 flex-shrink-0 justify-end">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                <Zap size={20} /> {student.totalXp}
              </div>
              <p className="text-xs text-slate-400 mt-1">{t(T.totalXp)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={20} /> {student.correctAnswers ?? Math.floor(student.totalXp / 10)}
              </div>
              <p className="text-xs text-slate-400 mt-1">{t(T.correctAnswers)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                {student.uniqueCorrectQuestions ?? '—'}
              </div>
              <p className="text-xs text-slate-400 mt-1">{t(T.uniqueQuestions)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-green-600 dark:text-green-400">
                <Trophy size={20} /> {student.completedLevels}
              </div>
              <p className="text-xs text-slate-400 mt-1">{t(T.completedLevels)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-red-500">
                <XCircle size={20} /> {student.totalErrors}
              </div>
              <p className="text-xs text-slate-400 mt-1">{t(T.totalErrors)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Personal plan matrix */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays size={16} className="text-[var(--shell-rail)]" />
            {t({
              uz: 'Shaxsiy reja natijalari',
              en: 'Personal plan results',
              ru: 'Личные результаты плана',
            })}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<PlanPeriod>
              value={planPeriod}
              onChange={setPlanPeriod}
              options={[
                { value: 'daily', label: t({ uz: 'Kunlik', en: 'Daily', ru: 'День' }) },
                { value: 'monthly', label: t({ uz: 'Oylik', en: 'Monthly', ru: 'Мес.' }) },
                { value: 'yearly', label: t({ uz: 'Yillik', en: 'Yearly', ru: 'Год' }) },
              ]}
            />
            {planPeriod === 'yearly' ? (
              <DatePicker
                picker="year"
                value={dayjs(`${planYear}-01-01`)}
                onChange={(d) => d && setPlanYear(d.format('YYYY'))}
                allowClear={false}
                className="w-[110px]"
              />
            ) : (
              <DatePicker
                picker="month"
                value={dayjs(`${planMonth}-01`)}
                onChange={(d) => d && setPlanMonth(d.format('YYYY-MM'))}
                allowClear={false}
                className="w-[140px]"
              />
            )}
          </div>
        </div>
        {!studentOrgId ? (
          <NoData
            text={t({
              uz: 'Tashkilot biriktirilmagan',
              en: 'No organization assigned',
              ru: 'Организация не назначена',
            })}
          />
        ) : planPeriod === 'yearly' ? (
          yearPlanLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
            <PlanMatrixTable
              data={studentYearMatrix}
              period="yearly"
              hideOrgColumn
              userId={id}
              pageSize={5}
            />
          )
        ) : planLoading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <PlanMatrixTable
            data={studentPlanMatrix}
            period={planPeriod}
            highlightDate={todayStr()}
            hideOrgColumn
            userId={id}
            pageSize={5}
          />
        )}
      </div>

      {/* XP history — qachon / qaysi savol / necha ball */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t(T.xpHistory)}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t(T.xpHistoryHint)}</p>
        </div>
        {xpLoading && !xpHistory ? (
          <div className="flex items-center justify-center h-16"><Spin /></div>
        ) : !xpHistory || xpHistory.data.length === 0 ? (
          <NoData text={t(T.noXpHistory)} />
        ) : (
          <Table
            dataSource={xpHistory.data}
            columns={xpColumns}
            rowKey="id"
            size="small"
            loading={xpLoading}
            pagination={{
              current: xpHistory.page,
              pageSize: xpHistory.limit,
              total: xpHistory.total,
              showSizeChanger: false,
              onChange: (page) => setXpPage(page),
            }}
          />
        )}
      </div>

      {/* Level progress */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">{t(T.progress)}</h3>
        <div className="space-y-3">
          {student.levelProgress.map((lp) => (
            <div key={lp.levelId} className="flex items-center gap-4">
              <span className="w-48 text-sm text-slate-700 dark:text-slate-300 truncate">{lp.title}</span>
              <Progress
                percent={lp.completionPercent}
                size="small"
                className="flex-1"
                status={lp.completionPercent >= 100 ? 'success' : 'active'}
              />
              {lp.completedAt && (
                <span className="text-xs text-slate-400 flex-shrink-0">
                  {new Date(lp.completedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Activity heatmap */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">{t(T.activity)}</h3>
        {actLoading ? (
          <div className="flex items-center justify-center h-16"><Spin /></div>
        ) : (
          <div className="flex gap-1.5 flex-wrap">
            {activity.map((day) => (
              <Tooltip key={day.date} title={`${day.date}: ${day.count} ta javob`}>
                <div
                  className={`w-8 h-8 rounded-md ${getActivityColor(day.count)} transition-colors flex items-center justify-center text-[10px] font-medium ${day.count > 0 ? 'text-white dark:text-slate-100' : 'text-slate-400 dark:text-slate-600'}`}
                >
                  {new Date(day.date).getDate()}
                </div>
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      {/* Lost questions */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">{t(T.lostQuestions)}</h3>
        {lqLoading ? (
          <div className="flex items-center justify-center h-16"><Spin /></div>
        ) : lostQuestions.length === 0 ? (
          <NoData text={t(T.noLostQuestions)} />
        ) : (
          <Table
            dataSource={lostQuestions}
            columns={lostColumns}
            rowKey="questionId"
            pagination={false}
            size="small"
          />
        )}
      </div>
    </div>
  );
};

export default StudentDetailPage;
