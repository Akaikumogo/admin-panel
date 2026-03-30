import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Input, Select, Spin, Table, Tag } from 'antd';
import { Filter, Mail, Search, Trophy, Zap } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useFetch, usePaginatedFetch } from '@/hooks/useFetch';
import HighlightText from '@/components/HighlightText';
import NoData from '@/components/NoData';
import apiService, { BACKEND_ORIGIN } from '@/services/api';
import type { StudentSummary, Level, Organization } from '@/services/api';

const T = {
  title: { uz: 'Talabalar', en: 'Students', ru: 'Студенты' },
  name: { uz: 'Ism', en: 'Name', ru: 'Имя' },
  email: { uz: 'Email', en: 'Email', ru: 'Email' },
  xp: { uz: 'XP', en: 'XP', ru: 'XP' },
  level: { uz: 'Joriy daraja', en: 'Current level', ru: 'Текущий уровень' },
  completed: { uz: 'Tugallangan', en: 'Completed', ru: 'Завершено' },
  org: { uz: 'Tashkilot', en: 'Organization', ru: 'Организация' },
  allOrgs: { uz: 'Barcha tashkilotlar', en: 'All organizations', ru: 'Все организации' },
  allLevels: { uz: 'Barcha darajalar', en: 'All levels', ru: 'Все уровни' },
  search: { uz: 'Qidirish...', en: 'Search...', ru: 'Поиск...' },
  noData: { uz: 'Talabalar yo`q', en: 'No students', ru: 'Нет студентов' },
  total: { uz: 'Jami', en: 'Total', ru: 'Всего' },
} as const;

const QP_DEFAULTS = {
  search: undefined,
  orgId: undefined,
  levelId: undefined,
  page: undefined,
} as const;

const Students = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { params: qp, setParam, setParams } = useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const currentPage = qp.page ? parseInt(qp.page, 10) : 1;

  const { data: students, total, loading, initialLoading } = usePaginatedFetch<StudentSummary>(
    ['students', qp.orgId, qp.levelId, qp.search, currentPage],
    () => apiService.getStudents({
      orgId: qp.orgId,
      levelId: qp.levelId,
      search: qp.search || undefined,
      page: currentPage,
      limit: 20,
    }),
  );

  const { data: orgs } = useFetch<Organization[]>(
    ['organizations-list'],
    () => apiService.getOrganizations(),
    [],
  );

  const { data: levels } = useFetch<Level[]>(
    ['levels-list'],
    () => apiService.getLevels(),
    [],
  );

  const handleSearchChange = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setParams({ search: value || undefined, page: undefined });
    }, 400);
  };

  const columns = [
    {
      title: t(T.name),
      key: 'name',
      render: (_: unknown, record: StudentSummary) => (
        <div className="flex items-center gap-3">
          <Avatar
            size={36}
            src={record.avatarUrl ? `${BACKEND_ORIGIN}${record.avatarUrl}` : undefined}
            className="bg-gradient-to-br from-blue-500 to-blue-700 flex-shrink-0"
          >
            {(record.firstName?.[0] || '') + (record.lastName?.[0] || '')}
          </Avatar>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">
              <HighlightText text={`${record.firstName} ${record.lastName}`} highlight={qp.search} />
            </p>
            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              {'⚡'.repeat(record.badge.bolts)} {record.badge.label}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: t(T.email),
      key: 'email',
      render: (_: unknown, record: StudentSummary) => (
        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Mail size={12} />
          <HighlightText text={record.email} highlight={qp.search} />
        </span>
      ),
    },
    {
      title: t(T.xp),
      key: 'xp',
      width: 100,
      render: (_: unknown, record: StudentSummary) => (
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
          <Zap size={14} /> {record.totalXp}
        </span>
      ),
    },
    {
      title: t(T.completed),
      key: 'completed',
      width: 120,
      render: (_: unknown, record: StudentSummary) => (
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <Trophy size={14} /> {record.completedLevels}
        </span>
      ),
    },
    {
      title: t(T.level),
      key: 'level',
      render: (_: unknown, record: StudentSummary) => (
        <Tag color="blue">{record.currentLevelTitle ?? '—'}</Tag>
      ),
    },
    {
      title: t(T.org),
      key: 'org',
      render: (_: unknown, record: StudentSummary) =>
        record.organizations.map((o) => (
          <Tag key={o.id}>{o.name}</Tag>
        )),
    },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <div className="flex items-center gap-3 flex-wrap bg-white dark:bg-[#141414] border border-slate-200 dark:border-slate-700/60 rounded-lg px-4 py-3">
        <Filter size={16} className="text-slate-400" />
        <Input
          allowClear
          defaultValue={qp.search}
          prefix={<Search size={14} className="text-slate-400" />}
          placeholder={t(T.search)}
          style={{ width: 220 }}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <Select
          allowClear
          placeholder={t(T.allOrgs)}
          style={{ width: 200 }}
          value={qp.orgId}
          onChange={(v) => setParams({ orgId: v, page: undefined })}
          options={orgs.map((o) => ({ value: o.id, label: o.name }))}
        />
        <Select
          allowClear
          placeholder={t(T.allLevels)}
          style={{ width: 200 }}
          value={qp.levelId}
          onChange={(v) => setParams({ levelId: v, page: undefined })}
          options={levels.map((l) => ({ value: l.id, label: l.title }))}
        />
        <Tag className="text-sm ml-auto">
          {t(T.total)}: {total}
        </Tag>
      </div>

      {initialLoading ? (
        <div className="flex items-center justify-center h-32">
          <Spin />
        </div>
      ) : students.length === 0 && !loading ? (
        <NoData text={t(T.noData)} />
      ) : (
        <div
          className={`bg-white dark:bg-[#141414] border border-slate-200 dark:border-slate-700/60 rounded-lg transition-opacity duration-150 ${loading ? 'opacity-50' : ''}`}
        >
          <Table
            dataSource={students}
            columns={columns}
            rowKey="id"
            loading={false}
            onRow={(record) => ({
              onClick: () => navigate(`/dashboard/students/${record.id}`),
              className: 'cursor-pointer',
            })}
            pagination={{
              current: currentPage,
              pageSize: 20,
              total,
              onChange: (pg) => setParam('page', pg > 1 ? String(pg) : undefined),
              showSizeChanger: false,
            }}
            size="middle"
          />
        </div>
      )}
    </div>
  );
};

export default Students;
