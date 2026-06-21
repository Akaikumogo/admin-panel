import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { BACKEND_ORIGIN } from '@/services/api';
import type { NesEmployeesSyncStatus } from '@/services/api';

export type SyncProgressEvent = {
  current: number;
  total: number;
  upserted: number;
  progressPercent: number;
};

export type SyncDoneEvent = {
  success: boolean;
  source: string;
  total: number;
  processed: number;
  upserted: number;
  hidden: number;
};

type Options = {
  onProgress?: (e: SyncProgressEvent) => void;
  onDone?: (e: SyncDoneEvent) => void;
  onError?: (message: string) => void;
};

export function mapSyncStatusToProgress(
  status: NesEmployeesSyncStatus,
): SyncProgressEvent {
  return {
    current: status.processed ?? status.current ?? 0,
    total: status.total ?? 0,
    upserted: status.upserted ?? 0,
    progressPercent: status.progressPercent ?? 0,
  };
}

export function useNesSyncSocket(options: Options) {
  const onProgressRef = useRef(options.onProgress);
  const onDoneRef = useRef(options.onDone);
  const onErrorRef = useRef(options.onError);
  onProgressRef.current = options.onProgress;
  onDoneRef.current = options.onDone;
  onErrorRef.current = options.onError;

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const socket: Socket = io(`${BACKEND_ORIGIN}/nes-sync`, {
      auth: { token: token ? `Bearer ${token}` : '' },
      transports: ['websocket', 'polling'],
    });

    socket.on('sync:progress', (e: SyncProgressEvent) => onProgressRef.current?.(e));
    socket.on('sync:done', (e: SyncDoneEvent) => onDoneRef.current?.(e));
    socket.on('sync:error', ({ message }: { message: string }) =>
      onErrorRef.current?.(message),
    );

    return () => {
      socket.disconnect();
    };
  }, []);
}
