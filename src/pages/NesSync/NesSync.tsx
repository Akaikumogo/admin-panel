import { useMemo, useRef, useState } from 'react';
import { Button, Card, DatePicker, Input, Modal, Select, Table, Tag, message } from 'antd';
import { Trash2, Filter, RefreshCw, Search, IdCard, Sparkles } from 'lucide-react';
import dayjs from 'dayjs';
import NoData from '@/components/NoData';
import { useNesSyncSocket, type SyncDoneEvent } from '@/hooks/useNesSyncSocket';
import { usePaginatedFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import apiService, {
  type NesEmployee,
  type NesEmployeePositionHistory,
} from '@/services/api';
import { isSuperAdmin } from '@/utils/isSuperAdmin';

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
  // { current: nechtasi qayta ishlandi, total: hammasi, created: nechtasi bazaga qo'shildi }
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; created: number }>({
    current: 0,
    total: 0,
    created: 0,
  });

  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [positionsOpen, setPositionsOpen] = useState(false);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positions, setPositions] = useState<PositionWithCurrent[]>([]);

  const [filterOptions, setFilterOptions] = useState<{ organizations: string[]; divisions: string[] }>({
    organizations: [],
    divisions: [],
  });

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

  // WebSocket — real-time progress
  useNesSyncSocket({
    onProgress: ({ current, total, created }) => {
      setSyncProgress({ current, total, created });
    },
    onDone: (res: SyncDoneEvent) => {
      setSyncing(false);
      setSyncProgress({ current: 0, total: 0, created: 0 });
      message.success(
        `Sync tugadi: ${res.total} ta topildi, ${res.created} ta yangi, ${res.updated} ta yangilandi`,
      );
      apiService.getNesEmployeesFilterOptions().then(setFilterOptions).catch(() => {});
      refetch?.();
    },
    onError: (msg) => {
      setSyncing(false);
      setSyncProgress({ current: 0, total: 0, created: 0 });
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
    setSyncProgress({ current: 0, total: 0, created: 0 });
    try {
      await apiService.syncNesEmployees(syncDate.format('YYYY-MM-DD'));
      // onDone WebSocket orqali keladi
    } catch {
      setSyncing(false);
      setSyncProgress({ current: 0, total: 0, created: 0 });
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    setDeleteConfirmOpen(false);
    try {
      const res = await apiService.deleteAllNesEmployees();
      message.success(`${res.deleted} ta xodim o'chirildi`);
      refetch?.();
      setFilterOptions({ organizations: [], divisions: [] });
    } catch {
      // xato notification api.ts tomonidan ko'rsatiladi
    } finally {
      setDeleting(false);
    }
  };

  const openPositions = async (record: NesEmployee) => {
    setPositionsOpen(true);
    setPositionsLoading(true);
    try {
      // record.id (UUID) bo'yicha — tabel raqami emas, aks holda boshqa tashkilotdagi
      // bir xil raqamli xodim bilan aralashib ketadi
      const data = await apiService.getNesEmployeePositions(record.id);
      setPositions(data as PositionWithCurrent[]);
    } finally {
      setPositionsLoading(false);
    }
  };

  // Sync button label: bazaga qo'shildi / topildi
  const syncLabel = (() => {
    if (!syncing) return 'ENERGO ID sinxronlash';
    if (syncProgress.total > 0) return `${syncProgress.created} / ${syncProgress.total}`;
    return 'Yuklanmoqda...';
  })();

  const columns = useMemo(() => {
    const base = [
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
    ];

    if (isSuperAdmin()) {
      base.push(
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
          render: (value: string | null) => (
            <Tag>{value || 'Excel export orqali'}</Tag>
          ),
        },
      );
    }

    base.push(
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
    );

    return base;
  }, []);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      {/* ENERGO ID — qora gradient hero header */}
      <div
        className="relative overflow-hidden rounded-2xl border border-black/30 shadow-2xl"
        style={{
          background:
            'linear-gradient(135deg, #000000 0%, #0a0a0a 35%, #1a1a2e 70%, #16213e 100%)',
        }}
      >
        {/* Glow effect */}
        <div
          className="absolute -top-24 -right-20 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-20 -left-16 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative flex items-center justify-between gap-4 px-6 py-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/20 shadow-lg"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <IdCard size={26} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="text-2xl font-bold tracking-tight text-white"
                  style={{
                    background:
                      'linear-gradient(90deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  ENERGO ID
                </h1>
                <Sparkles size={16} className="text-blue-300/70" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Xodimlar ma'lumotlar bazasi — markazlashgan sinxronizatsiya
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {syncing ? 'Sinxronlanmoqda...' : 'Tayyor'}
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
              Jami: <strong className="text-white">{total}</strong>
            </div>
          </div>
        </div>
      </div>

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
          style={{ width: 260 }}
          popupMatchSelectWidth={false}
          popupClassName="nes-select-popup"
          value={qp.organizationName ?? undefined}
          options={filterOptions.organizations.map((o) => ({ label: o, value: o }))}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          onChange={(val) => setParams({ organizationName: val ?? undefined, page: undefined })}
        />

        <Select
          allowClear
          showSearch
          placeholder="Bo'lim"
          style={{ width: 220 }}
          popupMatchSelectWidth={false}
          popupClassName="nes-select-popup"
          value={qp.division ?? undefined}
          options={filterOptions.divisions.map((d) => ({ label: d, value: d }))}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
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
          disabled={deleting}
          onClick={handleSync}
        >
          {syncLabel}
        </Button>

        <Button
          danger
          icon={<Trash2 size={16} />}
          loading={deleting}
          disabled={syncing || !isSuperAdmin()}
          hidden={!isSuperAdmin()}
          disabled={syncing}
          onClick={() => setDeleteConfirmOpen(true)}
        >
          Hammasini o'chirish
        </Button>

        <Tag className="text-sm ml-auto">Jami: {total}</Tag>
      </div>

      {/* Sync paytida progress ko'rsatuvchi satır */}
      {syncing && syncProgress.total > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 flex items-center gap-4 text-sm">
          <span className="text-blue-600 dark:text-blue-400 font-medium">Sync jarayonida...</span>
          <span className="text-slate-600 dark:text-slate-300">
            Topildi: <strong>{syncProgress.total}</strong>
          </span>
          <span className="text-slate-600 dark:text-slate-300">
            Qayta ishlandi: <strong>{syncProgress.current}</strong>
          </span>
          <span className="text-green-600 dark:text-green-400 font-semibold">
            Bazaga qo'shildi: <strong>{syncProgress.created}</strong>
          </span>
        </div>
      )}

      {employees.length === 0 && !initialLoading && !loading ? (
        <NoData text="ENERGO ID xodimlari hali sinxron qilinmagan" />
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

      {/* Bulk delete tasdiqlash modali */}
      <Modal
        title="Barcha xodimlarni o'chirish"
        open={deleteConfirmOpen}
        onCancel={() => setDeleteConfirmOpen(false)}
        onOk={handleDeleteAll}
        okText="Ha, o'chirib tashlash"
        cancelText="Bekor qilish"
        okButtonProps={{ danger: true }}
      >
        <p className="text-slate-700 dark:text-slate-300">
          Barcha <strong>{total}</strong> ta ENERGO ID xodimi va ularning user akkauntlari butunlay o'chiriladi.
          Bu amalni qaytarib bo'lmaydi. Davom etasizmi?
        </p>
      </Modal>
    </div>
  );
}
