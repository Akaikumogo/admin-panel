import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spin, Tag } from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import NoData from '@/components/NoData';
import apiService, { type AppNotification } from '@/services/api';

const T = {
  title: {
    uz: 'Bildirishnomalar',
    en: 'Notifications',
    ru: 'Уведомления',
  },
  review: { uz: 'Koʻrib chiqish', en: 'Review', ru: 'Проверить' },
  resolved: { uz: 'Yopilgan', en: 'Resolved', ru: 'Закрыто' },
  pending: { uz: 'Kutilmoqda', en: 'Pending', ru: 'Ожидает' },
  empty: {
    uz: 'Bildirishnoma yoʻq',
    en: 'No notifications',
    ru: 'Нет уведомлений',
  },
} as const;

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AppNotification[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getMyNotifications();
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onReview = async (n: AppNotification) => {
    const data = n.data ?? {};
    const path =
      typeof data.reviewPath === 'string'
        ? data.reviewPath
        : data.changeId
          ? `/dashboard/approvals?changeId=${data.changeId}`
          : data.employeeUserId && data.section
            ? `/dashboard/employees/${data.employeeUserId}?section=${data.section}&changeId=${data.changeId ?? ''}`
            : null;
    if (!n.isRead) {
      try {
        await apiService.markNotificationRead(n.id);
      } catch {
        /* ignore */
      }
    }
    if (path) navigate(path);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
        {t(T.title)}
      </h1>
      {loading ? (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      ) : rows.length === 0 ? (
        <NoData text={t(T.empty)} />
      ) : (
        <div className="space-y-3">
          {rows.map((n) => {
            const resolved = !!(n.data && (n.data as { resolved?: boolean }).resolved);
            return (
              <div
                key={n.id}
                className={`border border-border rounded-lg p-4 bg-card ${
                  n.isRead ? 'opacity-80' : ''
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {n.title}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      {n.body}
                    </div>
                    <div className="text-xs text-slate-400 mt-2">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {resolved ? (
                      <Tag color="default">{t(T.resolved)}</Tag>
                    ) : (
                      <Tag color="orange">{t(T.pending)}</Tag>
                    )}
                    {!resolved && n.data?.type === 'SAFETY_RECORD_APPROVAL' && (
                      <Button size="small" type="primary" onClick={() => void onReview(n)}>
                        {t(T.review)}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
