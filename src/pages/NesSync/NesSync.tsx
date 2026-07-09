import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Input, Modal, Progress, Select, Table, Tag, message } from '@/components/ui';
import type { ColumnsType } from '@/components/ui';
import { Trash2, Filter, RefreshCw, Search, IdCard, Sparkles, AlertCircle } from 'lucide-react';
import NoData from '@/components/NoData';
import {
  mapSyncStatusToProgress,
  useNesSyncSocket,
} from '@/hooks/useNesSyncSocket';
import { usePaginatedFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import apiService, {
  type NesEmployee,
  type NesEmployeesSyncStatus,
} from '@/services/api';
import { isSuperAdmin } from '@/utils/isSuperAdmin';

const QP_DEFAULTS = {
  search: undefined,
  organizationName: undefined,
  division: undefined,
  page: undefined,
} as const;

const POLL_MS = 2000;

type SyncProgress = {
  current: number;
  total: number;
  upserted: number;
  hidden: number;
  progressPercent: number;
  phase?: NesEmployeesSyncStatus['phase'];
  status: NesEmployeesSyncStatus['status'];
};

const EMPTY_PROGRESS: SyncProgress = {
  current: 0,
  total: 0,
  upserted: 0,
  hidden: 0,
  progressPercent: 0,
  status: 'IDLE',
};

function progressFromStatus(status: NesEmployeesSyncStatus | null): SyncProgress {
  if (!status) return EMPTY_PROGRESS;
  const mapped = mapSyncStatusToProgress(status);
  return {
    current: mapped.current,
    total: mapped.total,
    upserted: mapped.upserted,
    hidden: status.hidden ?? 0,
    progressPercent: mapped.progressPercent,
    phase: status.phase,
    status: status.status,
  };
}

export default function NesSync() {
  const { params: qp, setParam, setParams } =
    useQueryParams<typeof QP_DEFAULTS>(QP_DEFAULTS);
  const currentPage = qp.page ? parseInt(qp.page, 10) : 1;
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>(EMPTY_PROGRESS);
  const [latestSync, setLatestSync] = useState<NesEmployeesSyncStatus | null>(null);
  const lastNotifiedFinishedAtRef = useRef<string | null>(null);
  const wasSyncingRef = useRef(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [filterOptions, setFilterOptions] = useState<{ organizations: string[]; divisions: string[] }>({
    organizations: [],
    divisions: [],
  });

  useEffect(() => {
    apiService.getNesEmployeesFilterOptions().then(setFilterOptions).catch(() => {});
  }, []);

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

  const applyHealth = useCallback(
    (health: Awaited<ReturnType<typeof apiService.getNesEmployeesSyncHealth>>) => {
      const running = health.runningSync;
      const latest = health.latestSync;

      if (latest) setLatestSync(latest);

      if (running?.running) {
        wasSyncingRef.current = true;
        setSyncing(true);
        setSyncProgress(progressFromStatus(running));
        return;
      }

      setSyncing(false);

      if (latest) {
        setSyncProgress(progressFromStatus(latest));
      }

      if (
        wasSyncingRef.current &&
        latest?.finishedAt &&
        latest.finishedAt !== lastNotifiedFinishedAtRef.current
      ) {
        wasSyncingRef.current = false;
        lastNotifiedFinishedAtRef.current = latest.finishedAt;
        if (latest.status === 'SUCCESS') {
          setSyncError(null);
          message.success(
            `Sync tugadi: ${latest.total} ta, yangilandi ${latest.upserted}, yashirildi ${latest.hidden}`,
          );
          apiService.getNesEmployeesFilterOptions().then(setFilterOptions).catch(() => {});
          refetch?.();
        } else if (latest.status === 'FAILED' && latest.errorMessage) {
          setSyncError(latest.errorMessage);
          message.error(`Sync xatosi: ${latest.errorMessage}`);
        }
      } else if (latest?.status === 'FAILED' && latest.errorMessage) {
        setSyncError(latest.errorMessage);
      } else if (latest?.status === 'SUCCESS') {
        setSyncError(null);
      }
    },
    [refetch],
  );

  const pollSyncHealth = useCallback(async () => {
    try {
      const health = await apiService.getNesEmployeesSyncHealth();
      applyHealth(health);
    } catch {
      /* ignore transient poll errors */
    }
  }, [applyHealth]);

  useEffect(() => {
    pollSyncHealth();
  }, [pollSyncHealth]);

  useEffect(() => {
    if (!syncing) return;
    const timer = window.setInterval(pollSyncHealth, POLL_MS);
    return () => window.clearInterval(timer);
  }, [syncing, pollSyncHealth]);

  const finishSync = useCallback(() => {
    pollSyncHealth();
  }, [pollSyncHealth]);

  useNesSyncSocket({
    onProgress: ({ current, total, upserted, progressPercent }) => {
      setSyncing(true);
      setSyncProgress((prev) => ({
        ...prev,
        current,
        total,
        upserted,
        progressPercent,
        status: 'RUNNING',
      }));
    },
    onDone: finishSync,
    onError: (msg) => {
      setSyncing(false);
      setSyncProgress(EMPTY_PROGRESS);
      setSyncError(msg);
      message.error(`Sync xatosi: ${msg}`);
      pollSyncHealth();
    },
  });

  const handleSearchChange = (value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setParams({ search: value || undefined, page: undefined });
    }, 400);
  };

  const handleSync = async () => {
    wasSyncingRef.current = true;
    setSyncing(true);
    setSyncError(null);
    setSyncProgress({ ...EMPTY_PROGRESS, status: 'RUNNING' });
    try {
      const res = await apiService.syncNesEmployees();
      if (res.skipped) {
        setSyncing(false);
        message.warning(res.reason ?? 'Sync o‘tkazib yuborildi');
        return;
      }
      if (res.sync) {
        setSyncProgress(progressFromStatus(res.sync));
      }
      if (res.started || res.running) {
        pollSyncHealth();
      }
    } catch {
      setSyncing(false);
      setSyncProgress(EMPTY_PROGRESS);
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
    } finally {
      setDeleting(false);
    }
  };

  const syncLabel = (() => {
    if (!syncing) return 'ENERGO ID sinxronlash';
    if (syncProgress.phase === 'FINALIZING') return 'Yakunlanmoqda...';
    if (syncProgress.total > 0) {
      return `${syncProgress.current} / ${syncProgress.total} (${syncProgress.progressPercent}%)`;
    }
    return 'Yuklanmoqda...';
  })();

  const syncStatusLabel = syncing
    ? syncProgress.phase === 'FINALIZING'
      ? 'Yakunlanmoqda...'
      : 'Sinxronlanmoqda...'
    : 'Tayyor';

  const columns = useMemo<ColumnsType<NesEmployee>>(() => {
    const base: ColumnsType<NesEmployee> = [
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

    base.push({
      title: 'Sync',
      dataIndex: 'lastSyncedAt',
      key: 'lastSyncedAt',
      render: (value: string) => (
        <span className="text-sm">
          {value ? new Date(value).toLocaleString() : '—'}
        </span>
      ),
    });

    return base;
  }, []);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <div
        className="relative overflow-hidden rounded-2xl border border-black/30 shadow-2xl"
        style={{
          background:
            'linear-gradient(135deg, #000000 0%, #0a0a0a 35%, #1a1a2e 70%, #16213e 100%)',
        }}
      >
        <div
          className="absolute -top-24 -right-20 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-20 -left-16 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
        />
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
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
              <span
                className={`w-2 h-2 rounded-full ${syncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}
              />
              {syncStatusLabel}
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
              Jami: <strong className="text-white">{total}</strong>
            </div>
            {latestSync?.finishedAt && !syncing && (
              <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                Oxirgi: {new Date(latestSync.finishedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {(syncing || syncProgress.status === 'RUNNING') && (
        <Card className="!border-blue-200 dark:!border-blue-800 !bg-blue-50/50 dark:!bg-blue-950/20">
          <div className="flex items-center justify-between gap-3 mb-2 text-sm">
            <span className="font-medium text-blue-700 dark:text-blue-300">
              {syncProgress.phase === 'FINALIZING'
                ? 'Yakunlanmoqda (arxiv va tozalash)'
                : 'Energo ID → ElektroLearn sinxron'}
            </span>
            <span className="text-slate-600 dark:text-slate-300 font-mono">
              {syncProgress.current} / {syncProgress.total || '…'} ({syncProgress.progressPercent}%)
            </span>
          </div>
          <Progress
            percent={syncProgress.progressPercent}
            status="active"
            strokeColor={{ from: '#3b82f6', to: '#6366f1' }}
            showInfo={false}
          />
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-600 dark:text-slate-300">
            <span>
              Yangilandi: <strong>{syncProgress.upserted}</strong>
            </span>
            {syncProgress.hidden > 0 && (
              <span>
                Yashirildi: <strong>{syncProgress.hidden}</strong>
              </span>
            )}
          </div>
        </Card>
      )}

      {syncError && !syncing && (
        <Card className="border-destructive/40 bg-destructive/5 dark:bg-destructive/10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="font-semibold text-destructive">Sinxronizatsiya xatosi</p>
                <p className="text-sm text-muted-foreground mt-1 break-words">{syncError}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Bir filialda bir xil tabel raqam bo‘lsa, backend avtomatik noyoblashtiradi.
                  Xato davom etsa, backend yangi versiyasi deploy qilinganini tekshiring.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSync} className="shrink-0">
              <RefreshCw size={14} className="mr-2" />
              Qayta urinish
            </Button>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-3 flex-wrap bg-card border border-border rounded-lg px-4 py-3">
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

        <Button
          type="primary"
          icon={<RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />}
          loading={syncing && syncProgress.total === 0}
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
          onClick={() => setDeleteConfirmOpen(true)}
        >
          Hammasini o'chirish
        </Button>

        <Tag className="text-sm ml-auto">Jami: {total}</Tag>
      </div>

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
