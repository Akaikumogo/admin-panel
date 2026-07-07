import { useState } from 'react';
import { Drawer, DatePicker, Tag, List, Pagination, Spin, Empty } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { CheckCircle2, XCircle, ArrowLeftRight } from 'lucide-react';
import { apiService, type EmployeeAttemptsResponse } from '@/services/api';
import { useFetch } from '@/hooks/useFetch';

const PAGE_SIZE = 20;

/**
 * Xodim javoblari auditi: qaysi savolga qaysi variantni belgilagani.
 * To'g'ri javob — yashil, xato — qizil. Sana oralig'i tanlanadi (o'tgan
 * kunlarni ham ko'rish mumkin).
 */
export default function EmployeeAttemptsDrawer({
  orgId,
  userId,
  fullName,
  initialDate,
  onClose,
}: {
  orgId: string;
  userId: string | null;
  fullName: string;
  initialDate: string;
  onClose: () => void;
}) {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs(initialDate),
    dayjs(initialDate),
  ]);
  const [page, setPage] = useState(1);
  const fromStr = range[0].format('YYYY-MM-DD');
  const toStr = range[1].format('YYYY-MM-DD');

  const { data, loading } = useFetch<EmployeeAttemptsResponse | null>(
    ['employee-attempts', orgId, userId, fromStr, toStr, page],
    () =>
      apiService.getBranchEmployeeAttempts({
        orgId,
        userId: userId!,
        from: fromStr,
        to: toStr,
        page,
        limit: PAGE_SIZE,
      }),
    null,
    { enabled: !!userId && !!orgId },
  );

  return (
    <Drawer
      title={
        <div>
          <div className="font-semibold">{data?.fullName || fullName}</div>
          <div className="text-xs font-normal text-slate-500">
            Javoblar auditi — qaysi savolga qanday javob berdi
          </div>
        </div>
      }
      width={680}
      open={!!userId}
      onClose={onClose}
      destroyOnClose
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <DatePicker.RangePicker
          value={range}
          onChange={(v) => {
            if (!v) return;
            setRange(v as [Dayjs, Dayjs]);
            setPage(1);
          }}
          allowClear={false}
        />
        <Tag>Jami: {data?.total ?? 0}</Tag>
        <Tag color="success">To`g`ri: {data?.correctTotal ?? 0}</Tag>
        <Tag color="error">Xato: {data?.wrongTotal ?? 0}</Tag>
      </div>

      <Spin spinning={loading}>
        {data && data.items.length === 0 ? (
          <Empty description="Bu oraliqda javoblar yo`q" />
        ) : (
          <List
            dataSource={data?.items ?? []}
            renderItem={(item) => (
              <div
                className={`mb-2 rounded-xl border px-4 py-3 ${
                  item.isCorrect
                    ? 'border-green-200 bg-green-50 dark:border-green-700/50 dark:bg-green-500/10'
                    : 'border-red-200 bg-red-50 dark:border-red-700/50 dark:bg-red-500/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-slate-900 dark:text-white leading-snug">
                    {item.prompt}
                  </p>
                  {item.isCorrect ? (
                    <Tag color="success" className="!m-0 flex-shrink-0">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> To`g`ri
                      </span>
                    </Tag>
                  ) : (
                    <Tag color="error" className="!m-0 flex-shrink-0">
                      <span className="inline-flex items-center gap-1">
                        <XCircle size={12} /> Xato
                      </span>
                    </Tag>
                  )}
                </div>

                <div className="mt-2 space-y-1 text-xs">
                  {item.type === 'MATCHING' ? (
                    <Tag color="purple" className="!m-0">
                      <span className="inline-flex items-center gap-1">
                        <ArrowLeftRight size={11} /> Moslashtirish savoli
                      </span>
                    </Tag>
                  ) : (
                    <>
                      <div
                        className={
                          item.isCorrect
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-red-700 dark:text-red-300'
                        }
                      >
                        Belgilagan javobi:{' '}
                        <b>{item.selectedOptionText ?? '—'}</b>
                      </div>
                      {!item.isCorrect && item.correctOptionText ? (
                        <div className="text-green-700 dark:text-green-300">
                          To`g`ri javob: <b>{item.correctOptionText}</b>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span>{dayjs(item.answeredAt).format('DD.MM.YYYY HH:mm:ss')}</span>
                  {item.levelTitle ? <span>• {item.levelTitle}</span> : null}
                  {item.theoryTitle ? <span>• {item.theoryTitle}</span> : null}
                </div>
              </div>
            )}
          />
        )}
      </Spin>

      {data && data.total > PAGE_SIZE ? (
        <div className="mt-3 flex justify-center">
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
            total={data.total}
            onChange={setPage}
            showSizeChanger={false}
          />
        </div>
      ) : null}
    </Drawer>
  );
}
