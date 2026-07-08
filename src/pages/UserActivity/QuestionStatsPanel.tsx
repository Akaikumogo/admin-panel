import { Card, Progress, Table, Tag, Tooltip } from '@/components/ui';
import type { ColumnsType } from '@/components/ui';
import { AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';
import type { QuestionStatsRow } from '@/services/api';

type Props = {
  rows: QuestionStatsRow[];
};

const QuestionStatsPanel = ({ rows }: Props) => {
  const columns: ColumnsType<QuestionStatsRow> = [
    {
      title: '#',
      key: 'idx',
      width: 50,
      render: (_, __, i) => <span className="text-slate-400">{i + 1}</span>,
    },
    {
      title: 'Savol',
      dataIndex: 'questionText',
      key: 'questionText',
      ellipsis: true,
      render: (v: string) => (
        <Tooltip title={v}>
          <span className="text-slate-800 dark:text-slate-100">{v}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Urinish',
      dataIndex: 'attempts',
      key: 'attempts',
      width: 100,
      align: 'right',
      sorter: (a, b) => a.attempts - b.attempts,
    },
    {
      title: 'To\'g\'ri',
      dataIndex: 'correct',
      key: 'correct',
      width: 90,
      align: 'right',
      render: (v) => <Tag color="green">{v}</Tag>,
    },
    {
      title: 'Xato',
      dataIndex: 'wrong',
      key: 'wrong',
      width: 90,
      align: 'right',
      sorter: (a, b) => a.wrong - b.wrong,
      defaultSortOrder: 'descend',
      render: (v) => <Tag color="red">{v}</Tag>,
    },
    {
      title: 'Xato %',
      dataIndex: 'wrongRate',
      key: 'wrongRate',
      width: 180,
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          strokeColor={v > 60 ? '#ef4444' : v > 30 ? '#f59e0b' : '#10b981'}
        />
      ),
    },
    {
      title: 'Oxirgi javob',
      dataIndex: 'lastAttemptAt',
      key: 'lastAttemptAt',
      width: 140,
      render: (v: string | null) =>
        v ? dayjs(v).format('DD.MM HH:mm') : <span className="text-slate-400">—</span>,
    },
  ];

  return (
    <Card
      className="!rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"
      title={
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-500" />
          <span>Eng ko'p xato qilingan savollar</span>
          <span className="text-xs text-slate-400 font-normal ml-2">
            (xodimlar javoblari asosida)
          </span>
        </div>
      }
    >
      <Table<QuestionStatsRow>
        rowKey="questionId"
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 10 }}
        size="middle"
        scroll={{ x: 900 }}
      />
    </Card>
  );
};

export default QuestionStatsPanel;
