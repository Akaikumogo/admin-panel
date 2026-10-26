import { useState } from 'react';
import { Button, Input, Spin, Table } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { FilterBar, ListSurface } from '@/components/FilterBar';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import apiService from '@/services/api';
import { isSuperAdmin } from '@/utils/isSuperAdmin';

export default function ProctorDashboardPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({
    userId: '',
    safetyRecordId: '',
    standardId: '',
    scheduledAt: '',
    expiresAt: '',
  });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const dash = useFetch(['proctor-dash'], () => apiService.getProctorDashboard(), null);
  const rooms = useFetch(
    ['proctor-rooms', status],
    () => apiService.getProctorRooms({ status: status || undefined }),
    { total: 0, data: [] },
  );
  const standards = useFetch(['proctor-standards'], () => apiService.getProctorStandards(), []);
  const employees = useFetch(
    ['proctor-employees', search],
    () => apiService.getStudents({ search: search || undefined, limit: 8, light: true }),
    { data: [], total: 0, page: 1, limit: 8 },
  );

  const loadRecords = async (userId: string) => {
    setForm((prev) => ({ ...prev, userId, safetyRecordId: '' }));
    const bundle = await apiService.getEmployeeSafetyRecords(userId);
    const first = bundle.sections.find((section) => section.record?.id)?.record?.id ?? '';
    setForm((prev) => ({ ...prev, userId, safetyRecordId: first }));
  };

  const create = async () => {
    setError('');
    try {
      await apiService.createProctorRoom({
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        expiresAt: new Date(form.expiresAt).toISOString(),
      });
      rooms.refetch();
      dash.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xona yaratilmadi');
    }
  };

  if (dash.initialLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const stats = [
    ['Jami', dash.data?.total ?? 0],
    ['Kutilayotgan', dash.data?.upcoming ?? 0],
    ['Faol', dash.data?.active ?? 0],
    ['Uzilgan', dash.data?.interrupted ?? 0],
    ['Yakunlangan', dash.data?.completed ?? 0],
    ['O‘tgan', dash.data?.passed ?? 0],
    ['O‘tmagan', dash.data?.failed ?? 0],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t({ uz: 'Attestatsiya imtihoni', en: 'Attestation exams', ru: 'Аттестация' })}
        description={t({
          uz: 'Xona, standart va jonli kuzatuv',
          en: 'Rooms, standards and live monitoring',
          ru: 'Комнаты и наблюдение',
        })}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {stats.map(([label, value]) => (
          <div key={String(label)} className="border border-border px-3 py-2">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="font-mono text-xl tabular-nums">{value}</div>
          </div>
        ))}
      </div>
      <FilterBar>
        <Input placeholder="Xodim qidirish" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
        <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
      </FilterBar>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="max-h-40 overflow-auto border border-border">
          {employees.data?.data.map((employee) => (
            <button
              key={employee.id}
              htmlType="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => loadRecords(employee.id)}
            >
              {employee.lastName} {employee.firstName}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <Input placeholder="Safety yozuv ID" value={form.safetyRecordId} onChange={(e) => setForm({ ...form, safetyRecordId: e.target.value })} />
          <select
            className="h-10 w-full border border-border bg-background px-2 text-sm"
            value={form.standardId}
            onChange={(e) => setForm({ ...form, standardId: e.target.value })}
          >
            <option value="">Standart</option>
            {standards.data?.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
          <Button htmlType="button" onClick={create} disabled={!form.userId || !form.safetyRecordId || !form.standardId}>
            Xona yaratish
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </div>
      <ListSurface>
        <div className="mb-3">
          <Input placeholder="Holat filtri: IN_PROGRESS" value={status} onChange={(e) => setStatus(e.target.value)} />
        </div>
        <Table
          rowKey="id"
          dataSource={rooms.data?.data ?? []}
          pagination={false}
          columns={[
            { title: 'Standart', dataIndex: 'standardName' },
            { title: 'Bo‘lim', dataIndex: 'recordTypeCode' },
            { title: 'Holat', dataIndex: 'status' },
            { title: 'Aloqa', dataIndex: 'connectionStatus' },
            { title: 'Bildirishnoma', dataIndex: 'notificationStatus' },
            {
              title: '',
              key: 'actions',
              render: (_: unknown, row: { id: string; status: string; notificationStatus: string }) => (
                <div className="flex gap-2">
                  {row.notificationStatus !== 'SENT' ? (
                    <Button htmlType="button" onClick={() => apiService.retryProctorNotify(row.id).then(() => rooms.refetch())}>
                      Yuborish
                    </Button>
                  ) : null}
                  {isSuperAdmin() && row.status !== 'COMPLETED' ? (
                    <Button htmlType="button" onClick={() => apiService.restartProctorRoom(row.id).then(() => rooms.refetch())}>
                      Qayta boshlash
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </ListSurface>
    </div>
  );
}
