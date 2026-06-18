import { Button, Card, Table, Tag, Tabs, message } from 'antd';
import { ArrowLeft, Download, BarChart3 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFetch, usePaginatedFetch } from '@/hooks/useFetch';
import apiService, { type NesEmployee, type Organization, type StudentSummary } from '@/services/api';
import { isSuperAdmin } from '@/utils/isSuperAdmin';

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: org } = useFetch<Organization | null>(
    ['organization-detail', id],
    () => apiService.getOrganizationById(id!),
    null,
  );
  const { data: employees, total, initialLoading } = usePaginatedFetch<NesEmployee>(
    ['org-nes-employees', org?.name],
    () => {
      if (!org?.name) return Promise.resolve({ data: [], total: 0, page: 1, limit: 100 });
      return apiService.getNesEmployees({
        organizationName: org.name,
        page: 1,
        limit: 100,
      });
    },
  );
  const { data: appEmployees } = usePaginatedFetch<StudentSummary>(
    ['org-app-employees', id],
    () => {
      if (!id) return Promise.resolve({ data: [], total: 0, page: 1, limit: 50 });
      return apiService.getStudents({ orgId: id, page: 1, limit: 50 });
    },
  );

  const handleExport = async () => {
    if (!id) return;
    try {
      await apiService.exportOrganizationCredentials(id);
      message.success('Excel yuklab olindi');
    } catch {
      message.error('Export xatosi');
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/dashboard/organizations')}>
          Orqaga
        </Button>
        {isSuperAdmin() && (
          <Button type="primary" icon={<Download size={16} />} onClick={handleExport}>
            Login-parollar (Excel)
          </Button>
        )}
      </div>

      <Card title={org?.name || 'Tashkilot'}>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-xs text-slate-500">ID</div>
            <div className="font-mono text-sm">{org?.id}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Moderatorlar</div>
            <div className="text-sm">
              {(org?.users ?? [])
                .filter((u) => u.user.role === 'MODERATOR')
                .map((u) => `${u.user.firstName} ${u.user.lastName}`)
                .join(', ') || '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">App xodimlar</div>
            <div className="text-sm">{appEmployees.length} ta</div>
          </div>
        </div>

        <Tabs
          items={[
            {
              key: 'nes',
              label: '1C / NES xodimlar',
              children: (
                <>
                  <Table
                    rowKey="id"
                    loading={initialLoading}
                    dataSource={employees}
                    pagination={false}
                    columns={[
                      {
                        title: '№',
                        width: 64,
                        render: (_: unknown, __: NesEmployee, index: number) => index + 1,
                      },
                      {
                        title: 'Tabel',
                        dataIndex: 'personnelNumber',
                        render: (value: string) => <Tag>{value}</Tag>,
                      },
                      { title: 'F.I.O', dataIndex: 'fullName' },
                      { title: 'Lavozim', dataIndex: 'post' },
                      { title: 'Bo`lim', dataIndex: 'division' },
                    ]}
                  />
                  <div className="mt-3 text-xs text-slate-500">Jami: {total}</div>
                </>
              ),
            },
            {
              key: 'app',
              label: 'App xodimlar',
              children: (
                <Table
                  rowKey="id"
                  dataSource={appEmployees}
                  pagination={false}
                  columns={[
                    { title: 'F.I.O', render: (_: unknown, r: StudentSummary) => `${r.lastName} ${r.firstName}` },
                    { title: 'Login', dataIndex: 'email' },
                    { title: 'Tabel', dataIndex: 'personnelNumber', render: (v: string | null) => v ?? '—' },
                  ]}
                />
              ),
            },
            {
              key: 'analytics',
              label: 'Filial analitikasi',
              children: (
                <div className="py-2">
                  <Button
                    type="primary"
                    icon={<BarChart3 size={16} />}
                    onClick={() => navigate(`/dashboard/branch-analytics?orgId=${id}`)}
                  >
                    Filial analitikasini ochish
                  </Button>
                  <p className="mt-3 text-sm text-slate-500">
                    Kunlik plan, xodimlar aktivligi va offline kunlar statistikasi.
                  </p>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
