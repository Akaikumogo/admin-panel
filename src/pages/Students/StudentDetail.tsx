import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Avatar, Button, Form, Input, Progress, Select, Spin, Table, Tag, Tooltip } from 'antd';
import { ArrowLeft, Zap, Trophy, XCircle, Mail, Calendar } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import NoData from '@/components/NoData';
import apiService, { BACKEND_ORIGIN } from '@/services/api';
import type {
  StudentDetail as StudentDetailType,
  LostQuestion,
  ActivityDay,
  EmployeeCertificate,
  EmployeeCheck,
  EmployeeCheckType,
} from '@/services/api';

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
  const [certForm] = Form.useForm<{
    organizationId: string;
    positionTitle: string;
    certificateNumber: string;
    presentedByFullName: string;
  }>();
  const [checkForm] = Form.useForm<{
    type: EmployeeCheckType;
    checkDate: string;
    reason?: string;
    grade?: string;
    nextCheckDate?: string;
    commissionLeaderSignature?: string;
    qualificationGroup?: string;
    ruleName?: string;
    conclusion?: string;
    doctorConclusion?: string;
    responsibleSignature?: string;
  }>();
  const [checksType, setChecksType] = useState<EmployeeCheckType | 'all'>('all');

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

  const { data: employeeCert } = useFetch<EmployeeCertificate | null>(
    ['student-employee-certificate', id],
    () => apiService.getEmployeeCertificate(id!),
    null,
  );

  const { data: checks, initialLoading: checksLoading } = useFetch<EmployeeCheck[]>(
    ['student-checks', id, checksType],
    () => apiService.listEmployeeChecks(id!, checksType === 'all' ? {} : { type: checksType }),
    [],
  );

  if (initialLoading || !student) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spin size="large" />
      </div>
    );
  }

  const orgOptions = student.organizations.map((o) => ({
    value: o.id,
    label: o.name,
  }));

  const saveCertificate = async () => {
    const values = await certForm.validateFields();
    await apiService.upsertEmployeeCertificate(id!, values);
  };

  const addCheck = async () => {
    const values = await checkForm.validateFields();
    await apiService.createEmployeeCheck(id!, {
      ...values,
      reason: values.reason ?? null,
      grade: values.grade ?? null,
      nextCheckDate: values.nextCheckDate ?? null,
      commissionLeaderSignature: values.commissionLeaderSignature ?? null,
      qualificationGroup: values.qualificationGroup ?? null,
      ruleName: values.ruleName ?? null,
      conclusion: values.conclusion ?? null,
      doctorConclusion: values.doctorConclusion ?? null,
      responsibleSignature: values.responsibleSignature ?? null,
    } as any);
    checkForm.resetFields();
  };

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

      {/* Employee certificate */}
      <div className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-slate-700/60 rounded-lg p-6 space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Elektron guvohnoma
        </h3>
        <Form
          form={certForm}
          layout="vertical"
          initialValues={{
            organizationId: employeeCert?.organizationId ?? (student.organizations[0]?.id || undefined),
            positionTitle: employeeCert?.positionTitle ?? '',
            certificateNumber: employeeCert?.certificateNumber ?? '',
            presentedByFullName: employeeCert?.presentedByFullName ?? '',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="organizationId" label="Ish joyi (organization)" rules={[{ required: true }]}>
              <Select options={orgOptions} placeholder="Tashkilotni tanlang" />
            </Form.Item>
            <Form.Item name="positionTitle" label="Lavozim" rules={[{ required: true }]}>
              <Input placeholder="Lavozim" />
            </Form.Item>
            <Form.Item name="certificateNumber" label="Guvohnoma raqami" rules={[{ required: true }]}>
              <Input placeholder="Raqam" />
            </Form.Item>
            <Form.Item name="presentedByFullName" label="Taqdim etgan shaxs (F.I.Sh.)" rules={[{ required: true }]}>
              <Input placeholder="Ism Familiya" />
            </Form.Item>
          </div>
          <Button type="primary" onClick={() => void saveCertificate()}>
            Saqlash
          </Button>
        </Form>
      </div>

      {/* Employee checks */}
      <div className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-slate-700/60 rounded-lg p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Tekshiruvlar
          </h3>
          <Select
            value={checksType}
            onChange={(v) => setChecksType(v)}
            style={{ width: 280 }}
            options={[
              { value: 'all', label: 'Hammasi' },
              { value: 'GENERAL_KNOWLEDGE', label: 'Umumiy bilim' },
              { value: 'SAFETY_TECHNIQUE', label: 'Xavfsizlik texnikasi' },
              { value: 'SPECIAL_WORK_PERMIT', label: 'Maxsus ishlar ruxsati' },
              { value: 'RESUSCITATION_TRAINING', label: 'Reanimatsiya treningi' },
              { value: 'MEDICAL_EXAM', label: 'Tibbiy ko‘rik' },
            ]}
          />
        </div>

        <Form form={checkForm} layout="vertical">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Form.Item name="type" label="Type" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'GENERAL_KNOWLEDGE', label: 'Umumiy bilim' },
                  { value: 'SAFETY_TECHNIQUE', label: 'Xavfsizlik texnikasi' },
                  { value: 'SPECIAL_WORK_PERMIT', label: 'Maxsus ishlar ruxsati' },
                  { value: 'RESUSCITATION_TRAINING', label: 'Reanimatsiya treningi' },
                  { value: 'MEDICAL_EXAM', label: 'Tibbiy ko‘rik' },
                ]}
              />
            </Form.Item>
            <Form.Item name="checkDate" label="Tekshiruv sanasi" rules={[{ required: true }]}>
              <Input type="date" />
            </Form.Item>
            <Form.Item name="nextCheckDate" label="Keyingi tekshiruv sanasi">
              <Input type="date" />
            </Form.Item>
            <Form.Item name="reason" label="Sabab">
              <Input />
            </Form.Item>
            <Form.Item name="grade" label="Baho">
              <Input />
            </Form.Item>
            <Form.Item name="commissionLeaderSignature" label="Komissiya rahbari imzosi">
              <Input />
            </Form.Item>
            <Form.Item name="qualificationGroup" label="Malaka guruhi (xavfsizlik)">
              <Input />
            </Form.Item>
            <Form.Item name="ruleName" label="Qoida nomi (maxsus ishlar)">
              <Input />
            </Form.Item>
            <Form.Item name="conclusion" label="Xulosa (maxsus ishlar)">
              <Input />
            </Form.Item>
            <Form.Item name="doctorConclusion" label="Shifokor xulosasi (tibbiy)">
              <Input />
            </Form.Item>
            <Form.Item name="responsibleSignature" label="Mas’ul shaxs imzosi (tibbiy)">
              <Input />
            </Form.Item>
          </div>
          <Button type="primary" onClick={() => void addCheck()}>
            Tekshiruv qo‘shish
          </Button>
        </Form>

        {checksLoading ? (
          <div className="flex items-center justify-center h-16"><Spin /></div>
        ) : (
          <Table
            dataSource={checks}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: 'Sana', dataIndex: 'checkDate', key: 'checkDate', width: 120 },
              { title: 'Type', dataIndex: 'type', key: 'type', width: 180 },
              { title: 'Baho', dataIndex: 'grade', key: 'grade', width: 120 },
              { title: 'Keyingi sana', dataIndex: 'nextCheckDate', key: 'nextCheckDate', width: 140 },
              { title: 'Sabab', dataIndex: 'reason', key: 'reason', ellipsis: true },
              {
                title: '',
                key: 'actions',
                width: 90,
                render: (_: unknown, row: EmployeeCheck) => (
                  <Button danger size="small" onClick={() => void apiService.deleteEmployeeCheck(id!, row.id)}>
                    O‘chirish
                  </Button>
                ),
              },
            ]}
          />
        )}
      </div>
    </div>
  );
};

export default StudentDetailPage;
