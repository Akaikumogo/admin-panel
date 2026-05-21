import { useRef, useState } from 'react';
import { Button, Card, DatePicker, Input, Modal, Select, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { Filter, RefreshCw, Search } from 'lucide-react';
import NoData from '@/components/NoData';
import { useNesSyncSocket, type SyncDoneEvent } from '@/hooks/useNesSyncSocket';
import { usePaginatedFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import apiService, {
  type NesEmployee,
  type NesEmployeePositionHistory,
} from '@/services/api';

const QP_DEFAULTS = {
  search: undefined,
  organizationName: undefined,
  division: undefined,
  page: undefined,
} as const;

type PositionWithCurrent = NesEmployeePositionHistory & { isCurrent?: boolean };

export default function NesSync() {
  const { params: qp, setParam, setParams } =
    useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);
  const currentPage = qp.page ? parseInt(qp.page, 10) : 1;
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [syncDate, setSyncDate] = useState(dayjs());
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  const [positionsOpen, setPositionsOpen] = useState(false);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positions, setPositions] = useState<PositionWithCurrent[]>([]);

  const [filterOptions, setFilterOptions] = useState<{ organizations: string[]; divisions: string[] }>({
    organizations: [],
    divisions: [],
  });

  // Filter options bir marta yuklanadi (sync tugagach yangilanadi)
  useState(() => {
    apiService.getNesEmployeesFilterOptions()
      .then(setFilterOptions)
      .catch(() => {});
  });

  const {
    data: employees,
    total,
    loading,
    initialLoading,
    refetch,
  } = usePaginatedFetch<NesEmployee>(
    ['nes-employees', qp.search, qp.organizationName, qp.division, currentPage],
    () =>
      apiService.getNesEmployees({
        search: qp.search || undefined,
        organizationName: qp.organizationName || undefined,
        division: qp.division || undefined,
        page: currentPage,
        limit: 20,
      }),
  );

  // WebSocket — polling o'rniga real-time progress
  useNesSyncSocket({
    onProgress: ({ current, total }) => {
      setSyncProgress({ current, total });
    },
    onDone: (res: SyncDoneEvent) => {
      setSyncing(false);
      setSyncProgress({ current: 0, total: 0 });
      message.success(
        `1C sync: ${res.total} ta, yangi ${res.created}, yangilangan ${res.updated}, o'zgarmagan ${res.unchanged}`,
      );
      apiService.getNesEmployeesFilterOptions().then(setFilterOptions).catch(() => {});
      refetch?.();
    },
    onError: (msg) => {
      setSyncing(false);
      setSyncProgress({ current: 0, total: 0 });
      message.error(`Sync xatosi: ${msg}`);
    },
  });

  const handleSearchChange = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setParams({ search: value || undefined, page: undefined });
    }, 400);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncProgress({ current: 0, total: 0 });
    try {
      await apiService.syncNesEmployees(syncDate.format('YYYY-MM-DD'));
      // onDone WebSocket orqali keladi
    } catch {
      setSyncing(false);
      setSyncProgress({ current: 0, total: 0 });
    }
  };

  const openPositions = async (record: NesEmployee) => {
    setPositionsOpen(true);
    setPositionsLoading(true);
    try {
      const data = await apiService.getNesEmployeePositions(record.personnelNumber);
      setPositions(data as PositionWithCurrent[]);
    } finally {
      setPositionsLoading(false);
    }
  };

  // Button label
  const syncLabel = (() => {
    if (!syncing) return '1C bilan sinxronlash';
    if (syncProgress.total > 0) return `${syncProgress.current} / ${syncProgress.total}`;
    return 'Yuklanmoqda...';
  })();

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
          placeholder="Xodim, login yoki tabelnomer"
          style={{ width: 220 }}
          onChange={(e) => handleSearchChange(e.target.value)}
        />

        <Select
          allowClear
          showSearch
          placeholder="Tashkilot"
          style={{ width: 200 }}
          value={qp.organizationName ?? undefined}
          options={filterOptions.organizations.map((o) => ({ label: o, value: o }))}
          onChange={(val) => setParams({ organizationName: val ?? undefined, page: undefined })}
        />

        <Select
          allowClear
          showSearch
          placeholder="Bo'lim"
          style={{ width: 200 }}
          value={qp.division ?? undefined}
          options={filterOptions.divisions.map((d) => ({ label: d, value: d }))}
          onChange={(val) => setParams({ division: val ?? undefined, page: undefined })}
        />

        <DatePicker
          value={syncDate}
          format="YYYY-MM-DD"
          onChange={(value) => value && setSyncDate(value)}
        />

        <Button
          type="primary"
          icon={<RefreshCw size={16} />}
          loading={syncing}
          onClick={handleSync}
        >
          {syncLabel}
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

      {/* Xronologiya modal */}
      <Modal
        title="Lavozim xronologiyasi"
        open={positionsOpen}
        onCancel={() => setPositionsOpen(false)}
        footer={null}
        width={1000}
      >
        <Table
          dataSource={positions}
          rowKey="id"
          loading={positionsLoading}
          pagination={false}
          columns={[
            {
              title: 'Holat',
              key: 'isCurrent',
              width: 90,
              render: (_: unknown, record: PositionWithCurrent) =>
                record.isCurrent ? (
                  <Tag color="green">Joriy</Tag>
                ) : (
                  <Tag color="default">Avvalgi</Tag>
                ),
            },
            {
              title: 'Sana',
              dataIndex: 'effectiveAt',
              render: (v: string | null) => v ? new Date(v).toLocaleDateString() : '—',
            },
            { title: 'Filial', dataIndex: 'organizationName' },
            { title: "Bo'lim", dataIndex: 'division' },
            { title: 'Lavozim', dataIndex: 'post' },
          ]}
        />
      </Modal>
    </div>
  );
}
