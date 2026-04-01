import { useMemo, useState } from 'react';
import { Card, Select, Spin, Table, Tag } from 'antd';
import { ShieldAlert } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type { ModeratorViolationRow, UserProfile } from '@/services/api';

const T = {
  title: { uz: 'Qoidabuzarliklar', en: 'Violations', ru: 'Нарушения' },
  range: { uz: 'Davr', en: 'Range', ru: 'Период' },
  moderator: { uz: 'Moderator', en: 'Moderator', ru: 'Модератор' },
  today: { uz: 'Bugun', en: 'Today', ru: 'Сегодня' },
  month: { uz: '1 oy', en: 'Month', ru: 'Месяц' },
  year: { uz: '1 yil', en: 'Year', ru: 'Год' },
} as const;

export default function ViolationsPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<'today' | 'month' | 'year'>('today');
  const [moderatorId, setModeratorId] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data: me } = useFetch<UserProfile | null>(
    ['me'],
    () => apiService.me(),
    null,
  );

  const { data: moderators } = useFetch(
    ['moderators-for-filter'],
    async () => {
      const res = await apiService.getModerators({ limit: 200 });
      return res.data;
    },
    [] as UserProfile[],
  );

  const {
    data: violations,
    loading,
    initialLoading,
  } = useFetch(
    ['moderator-violations', range, moderatorId, page, limit],
    () =>
      apiService.getModeratorViolations({
        range,
        moderatorId,
        page,
        limit,
      }),
    { data: [], total: 0, page: 1, limit: 20, from: '', to: '' },
  );

  const columns = useMemo(
    () => [
      {
        title: t({ uz: 'Vaqt', en: 'Time', ru: 'Время' }),
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        render: (v: string) => new Date(v).toLocaleString(),
      },
      {
        title: t({ uz: 'Moderator', en: 'Moderator', ru: 'Модератор' }),
        dataIndex: 'moderator',
        key: 'moderator',
        render: (m: ModeratorViolationRow['moderator']) =>
          m ? `${m.firstName} ${m.lastName} (${m.email})` : '—',
      },
      {
        title: t({ uz: 'Action', en: 'Action', ru: 'Действие' }),
        dataIndex: 'actionKey',
        key: 'actionKey',
        width: 220,
        render: (v: string) => <Tag color="red">{v}</Tag>,
      },
      {
        title: t({ uz: 'Method', en: 'Method', ru: 'Метод' }),
        dataIndex: 'method',
        key: 'method',
        width: 90,
      },
      {
        title: t({ uz: 'Path', en: 'Path', ru: 'Путь' }),
        dataIndex: 'path',
        key: 'path',
        ellipsis: true,
      },
      {
        title: t({ uz: 'IP', en: 'IP', ru: 'IP' }),
        dataIndex: 'ip',
        key: 'ip',
        width: 140,
        render: (v: string | null) => v || '—',
      },
    ],
    [t],
  );

  if (me && me.role !== 'SUPERADMIN') return null;

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <Card
        className="!border-slate-200 dark:!border-slate-700/60"
        title={
          <span className="flex items-center gap-2">
            <ShieldAlert size={16} />
            {t(T.title)}
          </span>
        }
      >
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <Select
            value={range}
            style={{ width: 160 }}
            onChange={(v) => {
              setRange(v);
              setPage(1);
            }}
            options={[
              { value: 'today', label: t(T.today) },
              { value: 'month', label: t(T.month) },
              { value: 'year', label: t(T.year) },
            ]}
          />
          <Select
            allowClear
            placeholder={t(T.moderator)}
            style={{ width: 320 }}
            value={moderatorId}
            onChange={(v) => {
              setModeratorId(v || undefined);
              setPage(1);
            }}
            options={moderators.map((m) => ({
              value: m.id,
              label: `${m.firstName} ${m.lastName} (${m.email})`,
            }))}
          />
        </div>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={violations.data}
          columns={columns}
          pagination={{
            current: page,
            pageSize: limit,
            total: violations.total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p, ps) => {
              setPage(p);
              setLimit(ps);
            },
          }}
          size="small"
        />
      </Card>
    </div>
  );
}

