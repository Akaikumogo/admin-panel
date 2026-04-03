import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Spin, Table, Tag } from 'antd';
import { BarChart2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService, { type SuperadminAttemptSummary, type UserProfile } from '@/services/api';

export default function ExamAttemptAnalysisPage() {
  const { t } = useTranslation();
  const { data: me } = useFetch<UserProfile | null>(['me'], () => apiService.me(), null);

  const { data: attempts, initialLoading } = useFetch(
    ['superadmin-exam-attempts'],
    () => apiService.getSuperadminRecentAttempts(),
    [] as SuperadminAttemptSummary[],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: detail, isFetching: detailLoading } = useQuery({
    queryKey: ['superadmin-exam-detail', selectedId],
    queryFn: () => apiService.getSuperadminAttemptDetail(selectedId!),
    enabled: !!selectedId,
  });

  if (me && me.role !== 'SUPERADMIN') {
    return (
      <div className="p-6">
        <Card>{t({ uz: 'Faqat superadmin', en: 'Superadmin only', ru: 'Только суперадмин' })}</Card>
      </div>
    );
  }

  const listCols = useMemo(
    () => [
      {
        title: t({ uz: 'Sana', en: 'Date', ru: 'Дата' }),
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        render: (v: string) => new Date(v).toLocaleString(),
      },
      {
        title: t({ uz: 'Xodim', en: 'Employee', ru: 'Сотрудник' }),
        dataIndex: 'userName',
        key: 'userName',
      },
      {
        title: t({ uz: 'Imtihon', en: 'Exam', ru: 'Экзамен' }),
        dataIndex: 'examTitle',
        key: 'examTitle',
      },
      {
        title: 'PT %',
        dataIndex: 'ptScorePercent',
        key: 'pt',
        width: 72,
      },
      {
        title: 'TB %',
        dataIndex: 'tbScorePercent',
        key: 'tb',
        width: 72,
      },
      {
        title: t({ uz: 'Holat', en: 'Status', ru: 'Статус' }),
        key: 'fin',
        width: 100,
        render: (_: unknown, r: SuperadminAttemptSummary) =>
          r.finalizedAt ? <Tag color="green">OK</Tag> : <Tag>—</Tag>,
      },
    ],
    [t],
  );

  const answerCols = useMemo(
    () => [
      { title: '#', dataIndex: 'orderIndex', key: 'orderIndex', width: 50 },
      { title: 'PT/TB', dataIndex: 'section', key: 'section', width: 72 },
      {
        title: t({ uz: 'Savol', en: 'Question', ru: 'Вопрос' }),
        dataIndex: 'prompt',
        key: 'prompt',
        ellipsis: true,
      },
      {
        title: t({ uz: 'Tanlangan', en: 'Selected', ru: 'Выбор' }),
        dataIndex: 'selectedText',
        key: 'selectedText',
      },
      {
        title: t({ uz: 'To‘g‘ri', en: 'Correct', ru: 'Верно' }),
        dataIndex: 'isCorrect',
        key: 'isCorrect',
        width: 88,
        render: (v: boolean) => (v ? <Tag color="green">✓</Tag> : <Tag color="red">✗</Tag>),
      },
    ],
    [t],
  );

  if (initialLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] space-y-6 overflow-y-auto p-6">
      <Card
        className="!border-slate-200 dark:!border-slate-700/60"
        title={
          <span className="flex items-center gap-2">
            <BarChart2 size={16} />
            {t({ uz: 'Imtihon tahlili (superadmin)', en: 'Exam analytics', ru: 'Анализ экзаменов' })}
          </span>
        }
      >
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          {t({
            uz: 'Oxirgi urinishlar ro‘yxati. Qatorni tanlang — savol-javoblar faqat superadmin uchun.',
            en: 'Recent attempts. Select a row — Q&A visible to superadmin only.',
            ru: 'Последние попытки. Выберите строку.',
          })}
        </p>
        <Table
          rowKey="id"
          size="small"
          dataSource={attempts}
          columns={listCols}
          pagination={false}
          onRow={(r) => ({
            onClick: () => setSelectedId(r.id),
            className: selectedId === r.id ? 'bg-amber-50 dark:bg-amber-950/20' : '',
          })}
        />
      </Card>

      {selectedId ? (
        <Card
          className="!border-slate-200 dark:!border-slate-700/60"
          title={
            detail?.attempt.user?.name
              ? `${detail.attempt.user.name} — ${detail.attempt.id.slice(0, 8)}…`
              : selectedId
          }
          loading={detailLoading}
        >
          {detail ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <span>
                  PT: <strong>{detail.attempt.ptScorePercent ?? '—'}%</strong>
                </span>
                <span>
                  TB: <strong>{detail.attempt.tbScorePercent ?? '—'}%</strong>
                </span>
                <span>
                  {t({ uz: 'Umumiy', en: 'Combined', ru: 'Итого' })}:{' '}
                  <strong>{detail.attempt.scorePercent ?? '—'}%</strong>
                </span>
              </div>
              <Table
                rowKey={(r) => `${r.orderIndex}-${r.section}-${r.selectedOptionId}`}
                size="small"
                dataSource={detail.answers}
                columns={answerCols}
                pagination={false}
              />
            </div>
          ) : (
            !detailLoading && <p className="text-slate-500">—</p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
