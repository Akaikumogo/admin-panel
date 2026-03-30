import { useParams, useNavigate } from 'react-router-dom';
import { Avatar, Button, Progress, Spin, Table, Tag, Tooltip } from 'antd';
import { ArrowLeft, Zap, Trophy, XCircle, Mail, Calendar } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import NoData from '@/components/NoData';
import apiService from '@/services/api';
import type { StudentDetail as StudentDetailType, LostQuestion, ActivityDay } from '@/services/api';

const T = {
  back: { uz: 'Orqaga', en: 'Back', ru: 'Назад' },
  profile: { uz: 'Profil', en: 'Profile', ru: 'Профиль' },
  progress: { uz: 'Progress', en: 'Progress', ru: 'Прогресс' },
  lostQuestions: { uz: 'Ko`p xato qilingan savollar', en: 'Most failed questions', ru: 'Часто ошибаемые вопросы' },
  activity: { uz: 'Faollik (28 kun)', en: 'Activity (28 days)', ru: 'Активность (28 дней)' },
  totalXp: { uz: 'Jami XP', en: 'Total XP', ru: 'Всего XP' },
  completedLevels: { uz: 'Tugallangan darajalar', en: 'Completed levels', ru: 'Завершённые уровни' },
  totalErrors: { uz: 'Jami xatolar', en: 'Total errors', ru: 'Всего ошибок' },
  question: { uz: 'Savol', en: 'Question', ru: 'Вопрос' },
  level: { uz: 'Daraja', en: 'Level', ru: 'Уровень' },
  theory: { uz: 'Nazariya', en: 'Theory', ru: 'Теория' },
  wrongCount: { uz: 'Xatolar', en: 'Errors', ru: 'Ошибки' },
  attempts: { uz: 'Urinishlar', en: 'Attempts', ru: 'Попытки' },
  noLostQuestions: { uz: 'Xato qilingan savollar yo`q', en: 'No failed questions', ru: 'Нет ошибочных вопросов' },
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

  const { data: student, initialLoading } = useFetch<StudentDetailType | null>(
    ['student-detail', id],
    () => apiService.getStudent(id!),
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

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <Button
        type="text"
        icon={<ArrowLeft size={16} />}
        onClick={() => navigate('/dashboard/students')}
        className="!px-2"
      >
        {t(T.back)}
      </Button>

      {/* Profile card */}
      <div className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-slate-700/60 rounded-lg p-6">
        <div className="flex items-start gap-5">
          <Avatar
            size={72}
            src={student.avatarUrl ? `http://localhost:3000${student.avatarUrl}` : undefined}
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

          <div className="flex gap-6 flex-shrink-0">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                <Zap size={20} /> {student.totalXp}
              </div>
              <p className="text-xs text-slate-400 mt-1">{t(T.totalXp)}</p>
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

      {/* Level progress */}
      <div className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-slate-700/60 rounded-lg p-6">
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
      <div className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-slate-700/60 rounded-lg p-6">
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
      <div className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-slate-700/60 rounded-lg p-6">
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
