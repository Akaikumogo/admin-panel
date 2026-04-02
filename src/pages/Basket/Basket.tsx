import { useMemo } from 'react';
import { Button, Card, Spin, Table, Tag, message, Popconfirm } from 'antd';
import { Trash2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService from '@/services/api';
import type { Exam, ExamQuestion, Position, UserProfile } from '@/services/api';

export default function BasketPage() {
  const { t } = useTranslation();
  const { data: me } = useFetch<UserProfile | null>(['me'], () => apiService.me(), null);
  const { data, loading, initialLoading, refetch } = useFetch(
    ['basket'],
    () => apiService.getBasket(),
    { positions: [], exams: [], examQuestions: [] } as { positions: Position[]; exams: Exam[]; examQuestions: ExamQuestion[] },
  );

  const restore = async (type: 'positions' | 'exams' | 'exam-questions', id: string) => {
    await apiService.restoreBasketItem(type, id);
    message.success('Tiklandi');
    refetch();
  };

  const purge = async (type: 'positions' | 'exams' | 'exam-questions', id: string) => {
    await apiService.purgeBasketItem(type, id);
    message.success('Butunlay o‘chirildi');
    refetch();
  };

  const columns = useMemo(
    () => [
      { title: t({ uz: 'Turi', en: 'Type', ru: 'Тип' }), dataIndex: 'type', key: 'type', width: 140, render: (v: string) => <Tag>{v}</Tag> },
      { title: t({ uz: 'Nomi', en: 'Title', ru: 'Название' }), dataIndex: 'title', key: 'title' },
      {
        title: t({ uz: 'Amal', en: 'Action', ru: 'Действие' }),
        key: 'actions',
        width: 260,
        render: (_: unknown, r: any) => (
          <div className="flex items-center gap-2">
            <Button size="small" type="primary" onClick={() => restore(r.type, r.id)}>
              {t({ uz: 'Tiklash', en: 'Restore', ru: 'Восстановить' })}
            </Button>
            <Popconfirm title="Purge?" onConfirm={() => purge(r.type, r.id)}>
              <Button size="small" danger icon={<Trash2 size={14} />}>
                {t({ uz: 'Purge', en: 'Purge', ru: 'Удалить' })}
              </Button>
            </Popconfirm>
          </div>
        ),
      },
    ],
    [t],
  );

  if (me && me.role !== 'SUPERADMIN') return null;

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  const rows = [
    ...data.positions.map((p) => ({ id: p.id, type: 'positions' as const, title: p.title })),
    ...data.exams.map((e) => ({ id: e.id, type: 'exams' as const, title: e.title })),
    ...data.examQuestions.map((q) => ({ id: q.id, type: 'exam-questions' as const, title: q.prompt })),
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <Card
        className="!border-slate-200 dark:!border-slate-700/60"
        title={
          <span className="flex items-center gap-2">
            <Trash2 size={16} />
            {t({ uz: 'Korzinka', en: 'Basket', ru: 'Корзина' })}
          </span>
        }
      >
        <Table rowKey={(r) => `${r.type}:${r.id}`} loading={loading} dataSource={rows} columns={columns} pagination={false} size="small" />
      </Card>
    </div>
  );
}

