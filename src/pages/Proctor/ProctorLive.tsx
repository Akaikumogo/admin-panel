import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { PageHeader } from '@/components/PageHeader';
import { ListSurface } from '@/components/FilterBar';
import { Table } from '@/components/ui';
import { useFetch } from '@/hooks/useFetch';
import apiService, { getExamLiveSocketUrl } from '@/services/api';

export default function ProctorLivePage() {
  const live = useFetch(['proctor-live'], () => apiService.getProctorLive(), []);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [signal, setSignal] = useState('Kuzatuv tanlanmagan');
  const monitor = useFetch(
    ['proctor-monitor', roomId ?? 'none'],
    () => (roomId ? apiService.getProctorMonitor(roomId) : Promise.resolve(null)),
    null,
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      void live.refetch();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [live.refetch]);

  useEffect(() => {
    if (!roomId) return;
    const socket: Socket = io(`${getExamLiveSocketUrl()}/proctor-live`, {
      auth: { token: localStorage.getItem('accessToken') },
    });
    socket.on('connect', () => {
      socket.emit('join_room', { roomId }, (res: { live?: boolean; lastSeenAt?: string | null }) => {
        setSignal(res?.live ? 'Jonli aloqa bor' : `Aloqa yo‘q. Oxirgi: ${res?.lastSeenAt ?? '—'}`);
      });
    });
    socket.on('signal', () => setSignal('Media signali keldi'));
    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  return (
    <div className="space-y-6">
      <PageHeader title="Jonli kuzatuv" description={signal} />
      <ListSurface>
        <Table
          rowKey="id"
          pagination={false}
          dataSource={live.data ?? []}
          columns={[
            { title: 'Xona', dataIndex: 'standardName' },
            { title: 'Holat', dataIndex: 'status' },
            {
              title: 'Savol',
              key: 'question',
              render: (_: unknown, row: { questionIndex: number }) => row.questionIndex + 1,
            },
            {
              title: 'Qolgan',
              key: 'remaining',
              render: (_: unknown, row: { remainingMs: number | null }) =>
                row.remainingMs == null ? '—' : `${Math.ceil(row.remainingMs / 1000)} s`,
            },
            {
              title: 'Aloqa',
              key: 'connection',
              render: (_: unknown, row: { live: boolean; lastSeenAt: string | null }) =>
                row.live ? 'Jonli' : `Yo‘q · ${row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleTimeString() : '—'}`,
            },
            {
              title: '',
              key: 'open',
              render: (_: unknown, row: { id: string }) => (
                <button type="button" className="text-sm underline" onClick={() => setRoomId(row.id)}>
                  Ochish
                </button>
              ),
            },
          ]}
        />
      </ListSurface>
      {monitor.data ? (
        <pre className="overflow-auto border border-border p-3 text-xs">
          {JSON.stringify(monitor.data, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
