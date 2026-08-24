import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  MessageSquare,
  RefreshCw,
  Send,
  Settings2,
  Image as ImageIcon,
  Users,
  User,
} from 'lucide-react';
import { Button, Input, Switch, Tag, Textarea, message } from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import { isSuperAdmin } from '@/utils/isSuperAdmin';
import { cn } from '@/lib/utils';
import apiService, {
  type TelegramBotChat,
  type TelegramBotMessage,
} from '@/services/api';

const T = {
  title: { uz: 'Telegram Bot', en: 'Telegram Bot', ru: 'Telegram Bot' },
  settings: { uz: 'Sozlamalar', en: 'Settings', ru: 'Настройки' },
  token: { uz: 'Bot token', en: 'Bot token', ru: 'Токен бота' },
  webApp: { uz: 'Web App URL', en: 'Web App URL', ru: 'Web App URL' },
  enabled: { uz: 'Bot yoqilgan', en: 'Bot enabled', ru: 'Бот включён' },
  save: { uz: 'Saqlash', en: 'Save', ru: 'Сохранить' },
  chats: { uz: 'Chatlar', en: 'Chats', ru: 'Чаты' },
  empty: {
    uz: 'Hali chat yo‘q — botga /start yuboring',
    en: 'No chats yet — send /start to the bot',
    ru: 'Пока нет чатов — отправьте /start боту',
  },
  pick: {
    uz: 'Chapdan chatni tanlang',
    en: 'Select a chat on the left',
    ru: 'Выберите чат слева',
  },
  reply: { uz: 'Javob yozing…', en: 'Write a reply…', ru: 'Напишите ответ…' },
  send: { uz: 'Yuborish', en: 'Send', ru: 'Отправить' },
  report: { uz: 'Hisobot', en: 'Report', ru: 'Отчёт' },
  broadcast: {
    uz: 'Barchaga hisobot',
    en: 'Broadcast report',
    ru: 'Отчёт всем',
  },
  refresh: { uz: 'Yangilash', en: 'Refresh', ru: 'Обновить' },
  pollingOn: { uz: 'Polling ishlayapti', en: 'Polling active', ru: 'Polling активен' },
  pollingOff: { uz: 'Polling yo‘q', en: 'Polling off', ru: 'Polling выключен' },
  reportOn: { uz: 'Hisobot ON', en: 'Report ON', ru: 'Отчёт ON' },
  reportOff: { uz: 'Hisobot OFF', en: 'Report OFF', ru: 'Отчёт OFF' },
} as const;

export default function TelegramBotPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [tokenInput, setTokenInput] = useState('');
  const [webAppUrl, setWebAppUrl] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  const [tokenMasked, setTokenMasked] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [saving, setSaving] = useState(false);

  const [chats, setChats] = useState<TelegramBotChat[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TelegramBotMessage[]>([]);
  const [selectedChat, setSelectedChat] = useState<TelegramBotChat | null>(null);
  const [reply, setReply] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin()) {
      navigate('/dashboard/home');
    }
  }, [navigate]);

  const loadSettings = useCallback(async () => {
    try {
      const s = await apiService.getTelegramBotSettings();
      setHasToken(s.hasToken);
      setTokenMasked(s.tokenMasked);
      setWebAppUrl(s.webAppUrl || '');
      setIsEnabled(s.isEnabled);
      setPolling(s.polling);
      setTokenInput('');
    } catch {
      message.error('Sozlamalarni yuklab bo‘lmadi');
    }
  }, []);

  const loadChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      const rows = await apiService.getTelegramBotChats();
      setChats(rows);
    } catch {
      message.error('Chatlarni yuklab bo‘lmadi');
    } finally {
      setLoadingChats(false);
    }
  }, []);

  const loadMessages = useCallback(async (chatId: string) => {
    setLoadingMsgs(true);
    try {
      const data = await apiService.getTelegramBotMessages(chatId, 200);
      setSelectedChat(data.chat);
      setMessages(data.messages);
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)),
      );
    } catch {
      message.error('Xabarlarni yuklab bo‘lmadi');
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
    void loadChats();
    const id = window.setInterval(() => {
      void loadChats();
      if (selectedId) void loadMessages(selectedId);
    }, 8000);
    return () => window.clearInterval(id);
  }, [loadSettings, loadChats, loadMessages, selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSaveSettings = async () => {
    setSaving(true);
    try {
      const payload: {
        botToken?: string;
        webAppUrl?: string;
        isEnabled?: boolean;
      } = {
        webAppUrl,
        isEnabled,
      };
      if (tokenInput.trim()) payload.botToken = tokenInput.trim();
      const s = await apiService.updateTelegramBotSettings(payload);
      setHasToken(s.hasToken);
      setTokenMasked(s.tokenMasked);
      setPolling(s.polling);
      setTokenInput('');
      message.success('Saqlandi');
    } catch {
      message.error('Saqlab bo‘lmadi');
    } finally {
      setSaving(false);
    }
  };

  const onSelectChat = (id: string) => {
    setSelectedId(id);
    void loadMessages(id);
  };

  const onSendReply = async () => {
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    try {
      await apiService.replyTelegramBotChat(selectedId, reply.trim());
      setReply('');
      await loadMessages(selectedId);
      await loadChats();
    } catch {
      message.error('Javob yuborilmadi');
    } finally {
      setSending(false);
    }
  };

  const onSendReport = async () => {
    if (!selectedId) return;
    setSending(true);
    try {
      await apiService.sendTelegramBotReport(selectedId);
      message.success('Hisobot yuborildi');
      await loadMessages(selectedId);
    } catch {
      message.error('Hisobot yuborilmadi');
    } finally {
      setSending(false);
    }
  };

  const onBroadcast = async () => {
    setSending(true);
    try {
      await apiService.broadcastTelegramBotReport();
      message.success('Barcha hisobot chatlariga yuborildi');
      await loadChats();
      if (selectedId) await loadMessages(selectedId);
    } catch {
      message.error('Broadcast xato');
    } finally {
      setSending(false);
    }
  };

  const sortedChats = useMemo(
    () =>
      [...chats].sort((a, b) => {
        const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return tb - ta;
      }),
    [chats],
  );

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[520px] flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-foreground" />
          <h1 className="text-xl font-semibold text-foreground">{t(T.title)}</h1>
          <Tag color={polling ? 'success' : 'default'}>
            {polling ? t(T.pollingOn) : t(T.pollingOff)}
          </Tag>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => { void loadChats(); void loadSettings(); }}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            {t(T.refresh)}
          </Button>
          <Button variant="outline" size="sm" disabled={sending} onClick={() => void onBroadcast()}>
            <ImageIcon className="mr-1.5 h-4 w-4" />
            {t(T.broadcast)}
          </Button>
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <Settings2 className="h-4 w-4" />
          {t(T.settings)}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t(T.token)}</label>
            <Input
              type="password"
              placeholder={hasToken ? tokenMasked || '••••' : '123456:AA...'}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
            {hasToken && !tokenInput && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Joriy: {tokenMasked}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t(T.webApp)}</label>
            <Input value={webAppUrl} onChange={(e) => setWebAppUrl(e.target.value)} />
          </div>
          <div className="flex items-end justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
              {t(T.enabled)}
            </label>
            <Button onClick={() => void onSaveSettings()} disabled={saving}>
              {t(T.save)}
            </Button>
          </div>
        </div>
      </div>

      {/* Chat layout */}
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-lg border border-border bg-card md:grid-cols-[300px_1fr]">
        <aside className="flex min-h-0 flex-col border-b border-border md:border-b-0 md:border-r">
          <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t(T.chats)} ({sortedChats.length})
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingChats && sortedChats.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">…</p>
            ) : sortedChats.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">{t(T.empty)}</p>
            ) : (
              sortedChats.map((c) => {
                const active = c.id === selectedId;
                const isGroup = c.chatType === 'group' || c.chatType === 'supergroup';
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelectChat(c.id)}
                    className={cn(
                      'flex w-full items-start gap-2 border-b border-border/60 px-3 py-2.5 text-left transition-colors',
                      active ? 'bg-accent' : 'hover:bg-muted/60',
                    )}
                  >
                    <span className="mt-0.5 text-muted-foreground">
                      {isGroup ? <Users size={16} /> : <User size={16} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {c.displayName}
                        </span>
                        {c.unreadCount > 0 && (
                          <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                            {c.unreadCount}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1">
                        <Tag color={c.reportEnabled ? 'success' : 'default'}>
                          {c.reportEnabled ? t(T.reportOn) : t(T.reportOff)}
                        </Tag>
                        <span className="text-[10px] text-muted-foreground">
                          {c.chatType}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {c.lastMessagePreview || '—'}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
              <MessageSquare size={18} />
              {t(T.pick)}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                <div>
                  <div className="font-medium text-foreground">
                    {selectedChat?.displayName || '…'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ID: {selectedChat?.chatId} · {selectedChat?.chatType}
                    {selectedChat?.peerUsername
                      ? ` · @${selectedChat.peerUsername}`
                      : ''}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={sending}
                  onClick={() => void onSendReport()}
                >
                  <ImageIcon className="mr-1.5 h-4 w-4" />
                  {t(T.report)}
                </Button>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-muted/20 p-4">
                {loadingMsgs && messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">…</p>
                ) : (
                  messages.map((m) => {
                    const mine = m.direction === 'out';
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          'flex',
                          mine ? 'justify-end' : 'justify-start',
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                            mine
                              ? 'rounded-br-md bg-primary text-primary-foreground'
                              : 'rounded-bl-md border border-border bg-card text-foreground',
                            m.isCommand && 'border-dashed opacity-90',
                          )}
                        >
                          {!mine && (m.fromName || m.fromUsername) && (
                            <div className="mb-0.5 text-[11px] font-medium opacity-70">
                              {m.fromName || `@${m.fromUsername}`}
                            </div>
                          )}
                          {m.isCommand && (
                            <div className="mb-0.5 text-[10px] uppercase tracking-wide opacity-70">
                              command {m.commandName}
                            </div>
                          )}
                          {m.kind === 'report' && (
                            <div className="mb-0.5 text-[10px] uppercase tracking-wide opacity-70">
                              📊 hisobot
                            </div>
                          )}
                          <div className="whitespace-pre-wrap break-words">
                            {m.text || m.caption || '—'}
                          </div>
                          <div
                            className={cn(
                              'mt-1 text-[10px]',
                              mine ? 'opacity-70' : 'text-muted-foreground',
                            )}
                          >
                            {new Date(m.createdAt).toLocaleString()}
                            {m.sentByAdminId ? ' · admin' : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-border p-3">
                <div className="flex gap-2">
                  <Textarea
                    rows={2}
                    placeholder={t(T.reply)}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void onSendReply();
                      }
                    }}
                    className="min-h-[44px] flex-1 resize-none"
                  />
                  <Button
                    disabled={sending || !reply.trim()}
                    onClick={() => void onSendReply()}
                    className="self-end"
                  >
                    <Send className="mr-1.5 h-4 w-4" />
                    {t(T.send)}
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
