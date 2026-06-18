import { Avatar, Badge, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/uz-latn';
import { Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ActivityUserRow } from '@/services/api';

dayjs.extend(relativeTime);

type Props = {
  rows: ActivityUserRow[];
  onOpenUser: (userId: string) => void;
  formatDuration: (sec: number) => string;
};

const initials = (f: string, l: string) =>
  `${(f?.[0] ?? '').toUpperCase()}${(l?.[0] ?? '').toUpperCase()}`.trim() || '?';

const ActivityTable = ({ rows, onOpenUser, formatDuration }: Props) => {
  const navigate = useNavigate();

  const goToProfile = (userId: string) => {
    navigate(`/dashboard/students/${userId}`);
  };

  const columns: ColumnsType<ActivityUserRow> = [
    {
      title: 'Xodim',
      key: 'user',
      fixed: 'left',
      width: 240,
      render: (_, r) => (
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={(e) => {
            e.stopPropagation();
            goToProfile(r.userId);
          }}
          title="Profilni ochish"
        >
          <Badge dot color={r.isOnline ? 'green' : 'gray'} offset={[-4, 36]}>
            <Avatar style={{ background: '#3b82f6' }}>
              {initials(r.firstName, r.lastName)}
            </Avatar>
          </Badge>
          <div className="min-w-0">
            <div className="font-medium text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
              {r.firstName} {r.lastName}
            </div>
            <div className="text-xs text-slate-500 truncate">{r.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Filial',
      dataIndex: 'organizationName',
      key: 'organizationName',
      width: 180,
      render: (v) => v ?? <span className="text-slate-400">—</span>,
    },
    {
      title: 'Status',
      key: 'status',
      width: 110,
      render: (_, r) =>
        r.isOnline ? (
          <Tag color="green">Online</Tag>
        ) : (
          <Tag color="default">Offline</Tag>
        ),
    },
    {
      title: 'Kirgan vaqti',
      dataIndex: 'loginAt',
      key: 'loginAt',
      width: 160,
      render: (v: string | null) =>
        v ? (
          <Tooltip title={dayjs(v).format('DD.MM.YYYY HH:mm:ss')}>
            <span>{dayjs(v).format('DD.MM HH:mm')}</span>
          </Tooltip>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      title: 'Oxirgi faollik',
      dataIndex: 'lastSeenAt',
      key: 'lastSeenAt',
      width: 160,
      render: (v: string | null) =>
        v ? (
          <Tooltip title={dayjs(v).format('DD.MM.YYYY HH:mm:ss')}>
            <span>{dayjs(v).fromNow()}</span>
          </Tooltip>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      title: 'Bugungi online',
      dataIndex: 'todayOnlineSeconds',
      key: 'today',
      width: 130,
      align: 'right',
      sorter: (a, b) => a.todayOnlineSeconds - b.todayOnlineSeconds,
      render: (v: number) => (
        <span className="font-mono text-sm">{formatDuration(v)}</span>
      ),
    },
    {
      title: 'Davr bo\'yicha',
      dataIndex: 'rangeOnlineSeconds',
      key: 'range',
      width: 130,
      align: 'right',
      sorter: (a, b) => a.rangeOnlineSeconds - b.rangeOnlineSeconds,
      render: (v: number) => (
        <span className="font-mono text-sm font-semibold">
          {formatDuration(v)}
        </span>
      ),
    },
    {
      title: 'Oxirgi amal',
      key: 'lastEvent',
      width: 180,
      render: (_, r) =>
        r.lastEventType ? (
          <Tooltip
            title={
              r.lastEventAt ? dayjs(r.lastEventAt).format('DD.MM HH:mm:ss') : ''
            }
          >
            <Tag color="blue">{r.lastEventType}</Tag>
          </Tooltip>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      fixed: 'right',
      render: (_, r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenUser(r.userId);
          }}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
          title="Tezkor ko'rinish"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  return (
    <Table<ActivityUserRow>
      rowKey="userId"
      dataSource={rows}
      columns={columns}
      pagination={{ pageSize: 25, showSizeChanger: true }}
      scroll={{ x: 1200 }}
      size="middle"
      className="!rounded-2xl"
      onRow={(record) => ({
        onClick: () => goToProfile(record.userId),
        style: { cursor: 'pointer' },
      })}
    />
  );
};

export default ActivityTable;
