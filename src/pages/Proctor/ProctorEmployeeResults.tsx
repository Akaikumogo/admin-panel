import { Table } from '@/components/ui';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';

export function ProctorEmployeeResults({ userId }: { userId: string }) {
  const list = useFetch(['proctor-results', userId], () => apiService.getProctorResults(userId), []);
  return (
    <section className="border border-border bg-card p-4">
      <h2 className="mb-3 text-base font-semibold">Attestatsiya natijalari</h2>
      <Table
        rowKey={(row: { examDate: string | null; examinationName: string }) =>
          `${row.examinationName}-${row.examDate}`
        }
        pagination={false}
        dataSource={list.data ?? []}
        locale={{ emptyText: 'Natija yo‘q' }}
        columns={[
          { title: 'Imtihon', dataIndex: 'examinationName' },
          { title: 'Sana', dataIndex: 'examDate' },
          { title: 'Savollar', dataIndex: 'questionCount' },
          { title: 'To‘g‘ri', dataIndex: 'correctCount' },
          { title: 'Foiz', dataIndex: 'scorePercent' },
          { title: 'Baho', dataIndex: 'gradeLabel' },
          {
            title: 'Holat',
            key: 'passed',
            render: (_: unknown, row: { passed: boolean }) => (row.passed ? 'O‘tdi' : 'O‘tmadi'),
          },
          { title: 'Keyingi sana', dataIndex: 'nextExamDate', render: (v: string | null) => v ?? 'Ko‘rib chiqish' },
        ]}
      />
    </section>
  );
}
