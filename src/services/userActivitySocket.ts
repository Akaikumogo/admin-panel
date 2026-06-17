import { io, type Socket } from 'socket.io-client';
import { BACKEND_ORIGIN } from './api';

const NAMESPACE = '/user-activity';
const HEARTBEAT_INTERVAL = 30_000;

export type UserStatusEvent = {
  userId: string;
  status: 'online' | 'offline';
  at: string;
};

class UserActivitySocket {
  private socket: Socket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<(e: UserStatusEvent) => void>();

  connect(token: string) {
    if (this.socket?.connected) return;
    this.disconnect();

    this.socket = io(`${BACKEND_ORIGIN}${NAMESPACE}`, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
    });

    this.socket.on('user_status', (event: UserStatusEvent) => {
      this.listeners.forEach((cb) => cb(event));
    });

    this.heartbeatTimer = setInterval(() => {
      this.socket?.emit('heartbeat');
    }, HEARTBEAT_INTERVAL);
  }

  disconnect() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onStatus(cb: (e: UserStatusEvent) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  emitEvent(
    eventType: string,
    payload?: { entityType?: string; entityId?: string; metadata?: Record<string, unknown> },
  ) {
    this.socket?.emit('event', { eventType, ...payload });
  }
}

export const userActivitySocket = new UserActivitySocket();
