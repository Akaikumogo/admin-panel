import { Button, Card, Table, Tag } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFetch, usePaginatedFetch } from '@/hooks/useFetch';
import apiService, { type NesEmployee, type Organization } from '@/services/api';

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

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/dashboard/organizations')}>
        Orqaga
      </Button>
      <Card title={org?.name || 'Tashkilot'}>
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
            { title: 'Direktor', dataIndex: 'fullName' },
            { title: 'Lavozim', dataIndex: 'post' },
            { title: 'Bo`lim', dataIndex: 'division' },
          ]}
        />
        <div className="mt-3 text-xs text-slate-500">Jami direktorlar: {total}</div>
      </Card>
    </div>
  );
}
