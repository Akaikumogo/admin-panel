import { useState } from 'react';
import { Button, Input, Table } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { ListSurface } from '@/components/FilterBar';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import { isSuperAdmin } from '@/utils/isSuperAdmin';

export default function ProctorStandardsPage() {
  const questions = useFetch(['proctor-q-all'], () => apiService.getProctorQuestions({ page: 1 }), { total: 0, data: [] });
  const standards = useFetch(['proctor-standards'], () => apiService.getProctorStandards(), []);
  const policies = useFetch(['proctor-policies'], () => apiService.getProctorPolicies(), []);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    code: '',
    subject: '',
    durationMin: 40,
    passPercent: 70,
    maxRecordingMb: 500,
    totalQuestions: 10,
    months: 12,
    review: false,
  });

  const save = async () => {
    setError('');
    try {
      await apiService.saveProctorStandard({
        name: form.name,
        code: form.code,
        subject: form.subject,
        durationMs: form.durationMin * 60 * 1000,
        passPercent: Number(form.passPercent),
        maxRecordingMb: Number(form.maxRecordingMb),
        totalQuestions: Number(form.totalQuestions),
        randomizeQuestions: true,
        randomizeOptions: true,
        recordingRequired: true,
        questionIds: picked,
        nextExamRule: form.review ? { kind: 'review' } : { kind: 'months', months: Number(form.months) },
        gradeThresholds: [
          { minPercent: 85, label: 'A’lo' },
          { minPercent: Number(form.passPercent), label: 'Qoniqarli' },
        ],
      });
      standards.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Standart saqlanmadi');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Imtihon standartlari" description="Xona ochilganda nusxa muzlatiladi" />
      <div className="grid gap-2 md:grid-cols-3">
        <Input placeholder="Nomi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Kod" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <Input placeholder="Fan" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        <Input type="number" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} />
        <Input type="number" value={form.passPercent} onChange={(e) => setForm({ ...form, passPercent: Number(e.target.value) })} />
        <Input type="number" value={form.maxRecordingMb} onChange={(e) => setForm({ ...form, maxRecordingMb: Number(e.target.value) })} />
        <Input type="number" value={form.totalQuestions} onChange={(e) => setForm({ ...form, totalQuestions: Number(e.target.value) })} />
        <Input type="number" value={form.months} onChange={(e) => setForm({ ...form, months: Number(e.target.value) })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.review} onChange={(e) => setForm({ ...form, review: e.target.checked })} />
          Keyingi sana qo‘lda
        </label>
        <Button htmlType="button" onClick={save}>Saqlash</Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
      <div className="max-h-48 overflow-auto border border-border p-2 text-sm">
        {questions.data?.data.map((question) => (
          <label key={question.id} className="flex gap-2 py-1">
            <input
              type="checkbox"
              checked={picked.includes(question.id)}
              onChange={(e) =>
                setPicked((prev) =>
                  e.target.checked ? [...prev, question.id] : prev.filter((id) => id !== question.id),
                )
              }
            />
            <span>{question.category}: {question.prompt}</span>
          </label>
        ))}
      </div>
      <ListSurface>
        <Table
          rowKey="id"
          pagination={false}
          dataSource={standards.data ?? []}
          columns={[
            { title: 'Nomi', dataIndex: 'name' },
            { title: 'Kod', dataIndex: 'code' },
            { title: 'Savollar', render: (_: unknown, row: { questionIds: string[] }) => row.questionIds.length },
            { title: 'O‘tish %', dataIndex: 'passPercent' },
          ]}
        />
      </ListSurface>
      {isSuperAdmin() ? (
        <ListSurface>
          <Table
            rowKey="recordTypeCode"
            pagination={false}
            dataSource={policies.data ?? []}
            columns={[
              { title: 'Bo‘lim', dataIndex: 'recordTypeCode' },
              {
                title: 'Imtihon shart',
                render: (_: unknown, row: { recordTypeCode: string; requiresExamRoom: boolean; cutoffDate: string }) => (
                  <Button
                    htmlType="button"
                    onClick={() =>
                      apiService
                        .updateProctorPolicy(row.recordTypeCode, {
                          requiresExamRoom: !row.requiresExamRoom,
                          cutoffDate: String(row.cutoffDate).slice(0, 10),
                        })
                        .then(() => policies.refetch())
                    }
                  >
                    {row.requiresExamRoom ? 'Talab qilinadi' : 'Talab yo‘q'} · {String(row.cutoffDate).slice(0, 10)}
                  </Button>
                ),
              },
            ]}
          />
        </ListSurface>
      ) : null}
    </div>
  );
}
