import { useMemo, useState } from 'react';
import { Card, Segmented, Select, Spin, Table, Tag, Typography } from 'antd';
import { ScrollText } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type {
  AdminAuditLogRow,
  AdminAuditLogsResponse,
  Organization,
  UserProfile
} from '@/services/api';

const { Text } = Typography;

const T = {
  title: { uz: 'Loglar', en: 'Logs', ru: 'Логи' },
  range: { uz: 'Davr', en: 'Range', ru: 'Период' },
  today: { uz: 'Bugun', en: 'Today', ru: 'Сегодня' },
  month: { uz: '1 oy', en: 'Month', ru: 'Месяц' },
  year: { uz: '1 yil', en: 'Year', ru: 'Год' },
  actor: { uz: 'Kim', en: 'Actor', ru: 'Кто' },
  org: { uz: 'Tashkilot', en: 'Organization', ru: 'Организация' },
  status: { uz: 'Status', en: 'Status', ru: 'Статус' },
  view: { uz: 'Ko‘rinish', en: 'View', ru: 'Вид' },
  table: { uz: 'Jadval', en: 'Table', ru: 'Таблица' },
  text: { uz: 'Matn', en: 'Text', ru: 'Текст' }
} as const;

function formatLine(r: AdminAuditLogRow) {
  const t = new Date(r.createdAt).toLocaleString();
  const who = r.actorRole
    ? `${r.actorRole}${r.actorUserId ? `:${r.actorUserId}` : ''}`
    : 'anonymous';
  const org = r.actorOrganizationIds?.length
    ? ` orgs=${r.actorOrganizationIds.join(',')}`
    : '';
  const dur = typeof r.durationMs === 'number' ? ` ${r.durationMs}ms` : '';
  const msg = r.errorMessage ? ` err="${r.errorMessage}"` : '';
  return `[${t}] ${r.statusCode} ${r.method} ${r.path}${dur} actor=${who}${org}${msg}`;
}

export default function LogsPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<'today' | 'month' | 'year'>('today');
  const [actorId, setActorId] = useState<string | undefined>(undefined);
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [statusCode, setStatusCode] = useState<number | undefined>(undefined);
  const [view, setView] = useState<'table' | 'text'>('table');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data: me } = useFetch<UserProfile | null>(
    ['me'],
    () => apiService.me(),
    null
  );

  const { data: moderators } = useFetch(
    ['moderators-for-audit-filter'],
    async () => {
      const res = await apiService.getModerators({ limit: 200 });
      return res.data;
    },
    [] as UserProfile[]
  );

  const { data: orgs } = useFetch(
    ['orgs-for-audit-filter'],
    async () => {
      const res = await apiService.getOrganizations();
      return res;
    },
    [] as Organization[]
  );

  const {
    data: logs,
    loading,
    initialLoading
  } = useFetch<AdminAuditLogsResponse>(
    ['admin-audit-logs', range, actorId, orgId, statusCode, page, limit],
    () =>
      apiService.getAdminAuditLogs({
        range,
        actorId,
        orgId,
        statusCode,
        page,
        limit
      }),
    { data: [], total: 0, page: 1, limit: 20, from: '', to: '' }
  );

  const columns = useMemo(
    () => [
      {
        title: t({ uz: 'Vaqt', en: 'Time', ru: 'Время' }),
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        render: (v: string) => new Date(v).toLocaleString()
      },
      {
        title: t({ uz: 'Status', en: 'Status', ru: 'Статус' }),
        dataIndex: 'statusCode',
        key: 'statusCode',
        width: 90,
        render: (v: number) => (
          <Tag color={v >= 400 ? 'red' : v >= 300 ? 'orange' : 'green'}>
            {v}
          </Tag>
        )
      },
      {
        title: t({ uz: 'Method', en: 'Method', ru: 'Метод' }),
        dataIndex: 'method',
        key: 'method',
        width: 90
      },
      {
        title: t({ uz: 'Path', en: 'Path', ru: 'Путь' }),
        dataIndex: 'path',
        key: 'path',
        ellipsis: true
      },
      {
        title: t({ uz: 'Kim', en: 'Actor', ru: 'Кто' }),
        dataIndex: 'actorUserId',
        key: 'actorUserId',
        width: 260,
        render: (_: unknown, r: AdminAuditLogRow) => (
          <span>
            {r.actorRole || '—'}
            {r.actorUserId ? ` (${r.actorUserId})` : ''}
          </span>
        )
      },
      {
        title: t({ uz: 'IP', en: 'IP', ru: 'IP' }),
        dataIndex: 'ip',
        key: 'ip',
        width: 140,
        render: (v: string | null) => v || '—'
      }
    ],
    [t]
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
            <ScrollText size={16} />
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
              { value: 'year', label: t(T.year) }
            ]}
          />
          <Select
            allowClear
            placeholder={t(T.actor)}
            style={{ width: 340 }}
            value={actorId}
            onChange={(v) => {
              setActorId(v || undefined);
              setPage(1);
            }}
            options={moderators.map((m) => ({
              value: m.id,
              label: `${m.firstName} ${m.lastName} (${m.email})`
            }))}
          />
          <Select
            allowClear
            placeholder={t(T.org)}
            style={{ width: 260 }}
            value={orgId}
            onChange={(v) => {
              setOrgId(v || undefined);
              setPage(1);
            }}
            options={orgs.map((o) => ({
              value: o.id,
              label: o.name
            }))}
          />
          <Select
            allowClear
            placeholder={t(T.status)}
            style={{ width: 160 }}
            value={statusCode}
            onChange={(v) => {
              setStatusCode(v ?? undefined);
              setPage(1);
            }}
            options={[
              { value: 200, label: '200' },
              { value: 201, label: '201' },
              { value: 204, label: '204' },
              { value: 400, label: '400' },
              { value: 401, label: '401' },
              { value: 403, label: '403' },
              { value: 404, label: '404' },
              { value: 422, label: '422' },
              { value: 500, label: '500' }
            ]}
          />
          <Segmented
            value={view}
            onChange={(v) => setView(v as 'table' | 'text')}
            options={[
              { value: 'table', label: t(T.table) },
              { value: 'text', label: t(T.text) }
            ]}
          />
        </div>

        {view === 'text' ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700/60 p-3 bg-white dark:bg-slate-900">
            <Text code style={{ whiteSpace: 'pre-wrap', display: 'block' }}>
              {loading ? '...' : logs.data.map(formatLine).join('\n') || '—'}
            </Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            dataSource={logs.data}
            columns={columns}
            pagination={{
              current: page,
              pageSize: limit,
              total: logs.total,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              onChange: (p, ps) => {
                setPage(p);
                setLimit(ps);
              }
            }}
            size="small"
          />
        )}
      </Card>
    </div>
  );
}
