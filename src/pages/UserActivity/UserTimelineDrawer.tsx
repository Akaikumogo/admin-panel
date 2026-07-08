import { useEffect, useState } from 'react';
import { Drawer, Tabs, Timeline, Empty, Tag, Spin, List } from '@/components/ui';
import dayjs from 'dayjs';
import {
  userActivityApi,
  type ActivitySession,
  type ActivityTimelineEvent,
} from '@/services/api';

type Props = {
  userId: string | null;
  onClose: () => void;
};

const eventColor: Record<string, string> = {
  LOGIN: 'green',
  LOGOUT: 'red',
  HEARTBEAT: 'blue',
  MODULE_OPENED: 'cyan',
  THEORY_OPENED: 'geekblue',
  QUESTION_ANSWERED: 'purple',
  TEST_STARTED: 'orange',
  TEST_FINISHED: 'gold',
  CERTIFICATE_VIEWED: 'magenta',
};

const formatDuration = (sec: number) => {
  if (!sec || sec < 60) return `${sec || 0}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}s ${m}m` : `${m}m`;
};

const UserTimelineDrawer = ({ userId, onClose }: Props) => {
  const [events, setEvents] = useState<ActivityTimelineEvent[]>([]);
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      userActivityApi.timeline(userId),
      userActivityApi.sessions(userId, 'month'),
    ])
      .then(([ev, ss]) => {
        setEvents(ev);
        setSessions(ss);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <Drawer
      open={!!userId}
      onClose={onClose}
      title="Foydalanuvchi aktivligi"
      width={520}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Tabs
          items={[
            {
              key: 'events',
              label: 'Timeline',
              children:
                events.length === 0 ? (
                  <Empty description="Eventlar yo'q" />
                ) : (
                  <Timeline
                    items={events.map((e) => ({
                      color: eventColor[e.eventType] ?? 'gray',
                      children: (
                        <div>
                          <div className="flex items-center gap-2">
                            <Tag color={eventColor[e.eventType] ?? 'default'}>
                              {e.eventType}
                            </Tag>
                            <span className="text-xs text-slate-500">
                              {dayjs(e.createdAt).format('DD.MM HH:mm:ss')}
                            </span>
                          </div>
                          {e.entityType && (
                            <div className="text-xs text-slate-500 mt-1">
                              {e.entityType}
                              {e.entityId ? ` · ${e.entityId.slice(0, 8)}…` : ''}
                            </div>
                          )}
                        </div>
                      ),
                    }))}
                  />
                ),
            },
            {
              key: 'sessions',
              label: 'Sessions',
              children:
                sessions.length === 0 ? (
                  <Empty description="Sessionlar yo'q" />
                ) : (
                  <List
                    dataSource={sessions}
                    renderItem={(s) => (
                      <List.Item>
                        <div className="w-full">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">
                                {dayjs(s.loginAt).format('DD.MM.YYYY')}
                              </span>
                              <span className="text-slate-500 ml-2">
                                {dayjs(s.loginAt).format('HH:mm')} →{' '}
                                {s.logoutAt
                                  ? dayjs(s.logoutAt).format('HH:mm')
                                  : 'online'}
                              </span>
                            </div>
                            <Tag color={s.isOnline ? 'green' : 'default'}>
                              {formatDuration(s.durationSeconds)}
                            </Tag>
                          </div>
                          {s.ipAddress && (
                            <div className="text-xs text-slate-400 mt-1">
                              IP: {s.ipAddress}
                            </div>
                          )}
                        </div>
                      </List.Item>
                    )}
                  />
                ),
            },
          ]}
        />
      </Spin>
    </Drawer>
  );
};

export default UserTimelineDrawer;
