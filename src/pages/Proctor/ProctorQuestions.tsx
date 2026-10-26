import { useState } from 'react';
import { Button, Input, Table } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { ListSurface } from '@/components/FilterBar';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';

const empty = {
  prompt: '',
  subject: '',
  category: '',
  type: 'SINGLE' as 'SINGLE' | 'MULTIPLE',
  options: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
  ],
};

export default function ProctorQuestionsPage() {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const list = useFetch(['proctor-questions'], () => apiService.getProctorQuestions(), { total: 0, data: [] });

  const save = async () => {
    setError('');
    try {
      await apiService.saveProctorQuestion(form);
      setForm(empty);
      list.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saqlanmadi');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Imtihon savollari" description="To‘g‘ri javob xodimga ko‘rsatilmaydi" />
      <div className="grid gap-2 md:grid-cols-2">
        <Input placeholder="Fan" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        <Input placeholder="Toifa" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <select
          className="h-10 border border-border bg-background px-2 text-sm"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as 'SINGLE' | 'MULTIPLE' })}
        >
          <option value="SINGLE">Bitta javob</option>
          <option value="MULTIPLE">Bir nechta javob</option>
        </select>
        <Input placeholder="Savol" value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} />
        {form.options.map((opt, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder={`Variant ${index + 1}`}
              value={opt.text}
              onChange={(e) => {
                const options = [...form.options];
                options[index] = { ...opt, text: e.target.value };
                setForm({ ...form, options });
              }}
            />
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={opt.isCorrect}
                onChange={(e) => {
                  const options = form.options.map((item, i) =>
                    form.type === 'SINGLE'
                      ? { ...item, isCorrect: i === index }
                      : i === index
                        ? { ...item, isCorrect: e.target.checked }
                        : item,
                  );
                  setForm({ ...form, options });
                }}
              />
              To‘g‘ri
            </label>
          </div>
        ))}
        <Button htmlType="button" onClick={() => setForm({ ...form, options: [...form.options, { text: '', isCorrect: false }] })}>
          Variant
        </Button>
        <Button htmlType="button" onClick={save}>Saqlash</Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
      <ListSurface>
        <Table
          rowKey="id"
          pagination={false}
          dataSource={list.data?.data ?? []}
          columns={[
            { title: 'Savol', dataIndex: 'prompt' },
            { title: 'Toifa', dataIndex: 'category' },
            { title: 'Tur', dataIndex: 'type' },
            {
              title: '',
              key: 'actions',
              render: (_: unknown, row: { id: string }) => (
                <Button htmlType="button" onClick={() => apiService.deleteProctorQuestion(row.id).then(() => list.refetch())}>
                  O‘chirish
                </Button>
              ),
            },
          ]}
        />
      </ListSurface>
    </div>
  );
}
