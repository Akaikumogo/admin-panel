import { useMemo, useState } from 'react';
import { Select, Spin, Table, Tag } from '@/components/ui';
import { ShieldAlert } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type { ModeratorViolationRow, UserProfile } from '@/services/api';
import { DateTimeDisplay } from '@/components/DateTimeDisplay';
import { PageHeader } from '@/components/PageHeader';
import { FilterBar, ListSurface } from '@/components/FilterBar';

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
        width: 168,
        render: (v: string) => <DateTimeDisplay value={v} />,
      },
      {
        title: t({ uz: 'Moderator', en: 'Moderator', ru: 'Модератор' }),
        dataIndex: 'moderator',
        key: 'moderator',
        width: 220,
        ellipsis: true,
        render: (m: ModeratorViolationRow['moderator']) =>
          m ? (
            <span className="truncate" title={`${m.firstName} ${m.lastName} (${m.email})`}>
              {m.firstName} {m.lastName}{' '}
              <span className="text-muted-foreground">({m.email})</span>
            </span>
          ) : (
            '—'
          ),
      },
      {
        title: t({ uz: 'Action', en: 'Action', ru: 'Действие' }),
        dataIndex: 'actionKey',
        key: 'actionKey',
        width: 160,
        render: (v: string) => (
          <Tag color="default" className="font-mono text-[11px]">
            {v}
          </Tag>
        ),
      },
      {
        title: t({ uz: 'Method', en: 'Method', ru: 'Метод' }),
        dataIndex: 'method',
        key: 'method',
        width: 80,
        align: 'center' as const,
        render: (v: string) => (
          <span className="font-mono text-[11px] font-semibold uppercase text-muted-foreground">
            {v}
          </span>
        ),
      },
      {
        title: t({ uz: 'Path', en: 'Path', ru: 'Путь' }),
        dataIndex: 'path',
        key: 'path',
        ellipsis: true,
        render: (v: string) => (
          <span className="font-mono text-[12px] text-muted-foreground" title={v}>
            {v}
          </span>
        ),
      },
      {
        title: t({ uz: 'IP', en: 'IP', ru: 'IP' }),
        dataIndex: 'ip',
        key: 'ip',
        width: 128,
        render: (v: string | null) => (
          <span className="font-mono text-xs tabular-nums">{v || '—'}</span>
        ),
      },
    ],
    [t],
  );

  if (me && me.role !== 'SUPERADMIN') return null;

  if (initialLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        icon={ShieldAlert}
        title={t(T.title)}
        description={t({
          uz: 'Moderator harakatlari va taqiqlangan urinishlar',
          en: 'Moderator actions and forbidden attempts',
          ru: 'Действия модераторов и запрещённые попытки',
        })}
      />

      <ListSurface
        loading={loading}
        toolbar={
          <FilterBar>
            <Select
              value={range}
              className="w-[140px]"
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
              className="min-w-[200px] max-w-[320px] flex-1"
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
          </FilterBar>
        }
      >
        <Table
          rowKey="id"
          loading={false}
          dataSource={violations.data}
          columns={columns}
          variant="flat"
          className="!rounded-none !border-0"
          scroll={{ x: 960 }}
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
      </ListSurface>
    </div>
  );
}
