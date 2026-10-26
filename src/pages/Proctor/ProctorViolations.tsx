import { Navigate } from 'react-router-dom';
import { Table } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { ListSurface } from '@/components/FilterBar';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import { isSuperAdmin } from '@/utils/isSuperAdmin';

export default function ProctorViolationsPage() {
  const list = useFetch(['proctor-violations'], () => apiService.getProctorViolations(), { total: 0, data: [] });
  if (!isSuperAdmin()) return <Navigate to="/dashboard/home" replace />;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Xona qoidabuzarliklari"
        description="AnyDesk, Zoom, Google Meet va Telegram. Faqat markaziy apparat."
      />
      <ListSurface>
        <Table
          rowKey="id"
          pagination={false}
          dataSource={list.data?.data ?? []}
          locale={{ emptyText: 'Yozuvlar yo‘q' }}
          columns={[
            { title: 'Kod', dataIndex: 'code' },
            { title: 'Jarayon', dataIndex: 'processName' },
            { title: 'Oyna', dataIndex: 'windowTitle' },
            { title: 'Xona', dataIndex: 'roomId' },
            {
              title: 'Vaqt',
              dataIndex: 'occurredAt',
              render: (value: string) => new Date(value).toLocaleString(),
            },
          ]}
        />
      </ListSurface>
    </div>
  );
}
