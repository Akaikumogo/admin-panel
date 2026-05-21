import { useRef, useState } from 'react';
import { Button, Card, DatePicker, Input, Modal, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { Filter, RefreshCw, Search } from 'lucide-react';
import NoData from '@/components/NoData';
import { usePaginatedFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import apiService, {
  type NesEmployee,
  type NesEmployeePositionHistory,
} from '@/services/api';

const QP_DEFAULTS = {
  search: undefined,
  page: undefined,
} as const;

export default function NesSync() {
  const { params: qp, setParam, setParams } =
    useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);
  const currentPage = qp.page ? parseInt(qp.page, 10) : 1;
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [syncDate, setSyncDate] = useState(dayjs('2026-01-01'));
  const [syncing, setSyncing] = useState(false);
  const [positionsOpen, setPositionsOpen] = useState(false);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positions, setPositions] = useState<NesEmployeePositionHistory[]>([]);

  const {
    data: employees,
    total,
    loading,
    initialLoading,
    refetch,
  } = usePaginatedFetch<NesEmployee>(
    ['nes-employees', qp.search, currentPage],
    () =>
      apiService.getNesEmployees({
        search: qp.search || undefined,
        page: currentPage,
        limit: 20,
      }),
  );

  const handleSearchChange = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setParams({ search: value || undefined, page: undefined });
    }, 400);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await apiService.syncNesEmployees(
        syncDate.format('YYYY-MM-DD'),
      );
      message.success(
        `1C sync: ${res.total} ta, yangi ${res.created}, yangilangan ${res.updated}`,
      );
      refetch?.();
    } finally {
      setSyncing(false);
    }
  };

  const openPositions = async (record: NesEmployee) => {
    setPositionsOpen(true);
    setPositionsLoading(true);
    try {
      setPositions(await apiService.getNesEmployeePositions(record.personnelNumber));
    } finally {
      setPositionsLoading(false);
    }
  };

  const columns = [
    {
      title: 'Xodim',
      key: 'name',
      render: (_: unknown, record: NesEmployee) => (
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">
            {record.fullName || '—'}
          </p>
          <p className="text-xs text-slate-500">#{record.personnelNumber}</p>
        </div>
      ),
    },
    {
      title: 'Filial',
      dataIndex: 'organizationName',
      key: 'organizationName',
      render: (value: string) => <span className="text-sm">{value}</span>,
    },
    {
      title: 'Lavozim',
      key: 'post',
      render: (_: unknown, record: NesEmployee) => (
        <div>
          <p className="text-sm">{record.post || '—'}</p>
          <p className="text-xs text-slate-500">{record.division || '—'}</p>
        </div>
      ),
    },
    {
      title: 'Login',
      dataIndex: 'login',
      key: 'login',
      render: (value: string) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: 'Parol',
      dataIndex: 'initialPassword',
      key: 'initialPassword',
      render: (value: string | null) => <Tag>{value || 'avval berilgan'}</Tag>,
    },
    {
      title: 'Sync',
      dataIndex: 'lastSyncedAt',
      key: 'lastSyncedAt',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: '',
      key: 'actions',
      width: 160,
      render: (_: unknown, record: NesEmployee) => (
        <Button size="small" onClick={() => openPositions(record)}>
          Xronologiya
        </Button>
      ),
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
          placeholder="Xodim, login yoki personnel number"
          style={{ width: 260 }}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <DatePicker
          value={syncDate}
          onChange={(value) => value && setSyncDate(value)}
        />
        <Button
          type="primary"
          icon={<RefreshCw size={16} />}
          loading={syncing}
          onClick={handleSync}
        >
          1C bilan sinxronlash
        </Button>
        <Tag className="text-sm ml-auto">Jami: {total}</Tag>
      </div>

      {employees.length === 0 && !initialLoading && !loading ? (
        <NoData text="1C xodimlari hali sinxron qilinmagan" />
      ) : (
        <Card
          className={`!border-slate-200 dark:!border-slate-700/60 transition-opacity duration-150 ${loading ? 'opacity-50' : ''}`}
        >
          <Table
            dataSource={employees}
            columns={columns}
            rowKey="id"
            loading={initialLoading}
            pagination={{
              current: currentPage,
              pageSize: 20,
              total,
              onChange: (pg) =>
                setParam('page', pg > 1 ? String(pg) : undefined),
              showSizeChanger: false,
            }}
          />
        </Card>
      )}

      <Modal
        title="Lavozim xronologiyasi"
        open={positionsOpen}
        onCancel={() => setPositionsOpen(false)}
        footer={null}
        width={900}
      >
        <Table
          dataSource={positions}
          rowKey="id"
          loading={positionsLoading}
          pagination={false}
          columns={[
            { title: 'Sana', dataIndex: 'effectiveAt', render: (v) => v ? new Date(v).toLocaleString() : '—' },
            { title: 'Filial', dataIndex: 'organizationName' },
            { title: 'Bo`lim', dataIndex: 'division' },
            { title: 'Lavozim', dataIndex: 'post' },
          ]}
        />
      </Modal>
    </div>
  );
}
