import { useRef } from 'react';
import { Avatar, Card, Input, Select, Spin, Table, Tag } from 'antd';
import { Filter, Mail, Search } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useQueryParams } from '@/hooks/useQueryParams';
import { usePaginatedFetch } from '@/hooks/useFetch';
import HighlightText from '@/components/HighlightText';
import NoData from '@/components/NoData';
import apiService from '@/services/api';
import type { UserProfile } from '@/services/api';

const T = {
  title: { uz: 'Foydalanuvchilar', en: 'Users', ru: 'Пользователи' },
  name: { uz: 'Ism', en: 'Name', ru: 'Имя' },
  email: { uz: 'Email', en: 'Email', ru: 'Email' },
  role: { uz: 'Rol', en: 'Role', ru: 'Роль' },
  allRoles: { uz: 'Barcha rollar', en: 'All roles', ru: 'Все роли' },
  search: { uz: 'Qidirish...', en: 'Search...', ru: 'Поиск...' },
  noData: {
    uz: 'Foydalanuvchilar yo`q',
    en: 'No users',
    ru: 'Нет пользователей'
  },
  total: { uz: 'Jami', en: 'Total', ru: 'Всего' }
} as const;

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: 'red',
  MODERATOR: 'blue',
  USER: 'default'
};

const QP_DEFAULTS = {
  search: undefined,
  role: undefined,
  page: undefined
} as const;

const Users = () => {
  const { t } = useTranslation();
  const { params: qp, setParam, setParams } = useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const currentPage = qp.page ? parseInt(qp.page, 10) : 1;

  const { data: users, total, loading, initialLoading } = usePaginatedFetch(
    ['users', qp.role, qp.search, currentPage],
    () => apiService.getUsers({ role: qp.role, search: qp.search || undefined, page: currentPage, limit: 20 }),
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
      render: (_: unknown, record: UserProfile) => (
        <div className="flex items-center gap-3">
          <Avatar
            size={36}
            src={
              record.avatarUrl
                ? `http://localhost:3000${record.avatarUrl}`
                : undefined
            }
            className="bg-gradient-to-br from-blue-500 to-blue-700 flex-shrink-0"
          >
            {(record.firstName?.[0] || '') + (record.lastName?.[0] || '')}
          </Avatar>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">
              <HighlightText
                text={`${record.firstName} ${record.lastName}`}
                highlight={qp.search}
              />
            </p>
          </div>
        </div>
      )
    },
    {
      title: t(T.email),
      key: 'email',
      render: (_: unknown, record: UserProfile) => (
        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Mail size={12} />{' '}
          <HighlightText text={record.email} highlight={qp.search} />
        </span>
      )
    },
    {
      title: t(T.role),
      key: 'role',
      render: (_: unknown, record: UserProfile) => (
        <Tag color={ROLE_COLORS[record.role] || 'default'}>{record.role}</Tag>
      )
    }
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
          placeholder={t(T.allRoles)}
          style={{ width: 180 }}
          value={qp.role}
          onChange={(v) => setParams({ role: v, page: undefined })}
          options={[
            { value: 'SUPERADMIN', label: 'SuperAdmin' },
              { value: 'MODERATOR', label: 'Moderator' },
              { value: 'USER', label: 'User' }
            ]}
          />
        <Tag className="text-sm ml-auto">
          {t(T.total)}: {total}
        </Tag>
      </div>

      {initialLoading ? (
        <div className="flex items-center justify-center h-32">
          <Spin />
        </div>
      ) : users.length === 0 && !loading ? (
        <NoData text={t(T.noData)} />
      ) : (
        <Card
          className={`!border-slate-200 dark:!border-slate-700/60 transition-opacity duration-150 ${loading ? 'opacity-50' : ''}`}
        >
          <Table
            dataSource={users}
            columns={columns}
            rowKey="id"
            loading={false}
            pagination={{
              current: currentPage,
              pageSize: 20,
              total,
              onChange: (pg) =>
                setParam('page', pg > 1 ? String(pg) : undefined),
              showSizeChanger: false
            }}
            size="middle"
          />
        </Card>
      )}
    </div>
  );
};

export default Users;
