import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ArrowUp, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { BACKEND_ORIGIN } from '@/services/api';
import apiService from '@/services/api';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type ChatSession = {
  id: string;
  title: string;
  updatedAt: string;
};

type Audience = 'superadmin' | 'central' | 'branch';

const PROMPTS: Record<Audience, string[]> = {
  superadmin: [
    'Bugungi reja reytingida qaysi filial oldinda?',
    'Shu oylik hisobot bo‘yicha qayerda foiz past?',
    '608-son qaror bo‘yicha bilim sinovi qanchalik tez-tez o‘tkaziladi?',
  ],
  central: [
    'Markaziy apparatning bugungi reja foizi qancha?',
    'Oxirgi yuklangan hisobot qaysi oyga tegishli?',
    '609-son qaror nima haqida?',
  ],
  branch: [
    'Shu filialning bugungi reja foizi qancha?',
    'Oylik hisobotda necha kun bajarilgan?',
    '608-son bo‘yicha stajirovka necha smenadan iborat?',
  ],
};

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function AiAssistantPage() {
  const socketRef = useRef<Socket | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<'connecting' | 'ready' | 'error'>('connecting');
  const [isStreaming, setIsStreaming] = useState(false);
  const [audience, setAudience] = useState<Audience>('branch');
  const [scopeLabel, setScopeLabel] = useState('Yuklanmoqda');
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [waitText, setWaitText] = useState('');

  const refreshSessions = () => {
    apiService
      .getAiChatSessions()
      .then((result) => setSessions(result.data))
      .catch(() => setSessions([]));
  };

  useEffect(() => {
    apiService
      .getAiChatStatus()
      .then((s) => {
        setAiReady(s.ready);
        setAudience(s.audience);
        setScopeLabel(s.scopeLabel);
      })
      .catch(() => setAiReady(false));
    refreshSessions();
  }, []);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setStatus('error');
      return;
    }

    const socket = io(`${BACKEND_ORIGIN}/ai-chat`, {
      auth: { token, scope: 'admin' },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;
    socket.on('connect', () => setStatus('ready'));
    socket.on('assistant_ready', () => setStatus('ready'));
    socket.on('connect_error', () => setStatus('error'));
    socket.on('disconnect', () => setStatus('error'));
    socket.on('session_ready', ({ id, title }: { id: string; title: string }) => {
      setActiveId(id);
      activeIdRef.current = id;
      setSessions((prev) => {
        const rest = prev.filter((row) => row.id !== id);
        return [{ id, title, updatedAt: new Date().toISOString() }, ...rest];
      });
    });
    socket.on('assistant_started', () => {
      setIsStreaming(true);
      setWaitText('');
      setMessages((prev) => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: 'assistant', content: '' },
      ]);
    });
    socket.on('assistant_status', ({ text }: { text?: string }) => {
      setWaitText(text ?? '');
    });
    socket.on('assistant_chunk', ({ chunk }: { chunk?: string }) => {
      if (!chunk) return;
      setWaitText('');
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (!last || last.role !== 'assistant') return next;
        next[next.length - 1] = { ...last, content: `${last.content}${chunk}` };
        return next;
      });
    });
    socket.on('assistant_done', () => {
      setIsStreaming(false);
      setWaitText('');
      refreshSessions();
    });
    socket.on('assistant_error', ({ message }: { message?: string }) => {
      setIsStreaming(false);
      setWaitText('');
      const text = message ?? 'AI bilan bog‘lanishda xato bo‘ldi.';
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant' && !last.content) {
          next[next.length - 1] = { ...last, content: text };
          return next;
        }
        return [...next, { id: `error-${Date.now()}`, role: 'assistant', content: text }];
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    viewportRef.current?.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isStreaming]);

  const openSession = async (id: string) => {
    if (isStreaming || id === activeId) return;
    activeIdRef.current = id;
    setActiveId(id);
    const result = await apiService.getAiChatMessages(id);
    setMessages(
      result.data.map((row) => ({
        id: row.id,
        role: row.role,
        content: row.content,
      })),
    );
  };

  const startNewChat = () => {
    if (isStreaming) return;
    activeIdRef.current = null;
    setActiveId(null);
    setMessages([]);
    setDraft('');
  };

  const removeSession = async (id: string) => {
    if (isStreaming) return;
    await apiService.deleteAiChatSession(id);
    setSessions((prev) => prev.filter((row) => row.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  };

  const sendMessage = (text: string) => {
    const message = text.trim();
    if (!message || isStreaming || status !== 'ready' || !socketRef.current) return;
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: message },
    ]);
    setDraft('');
    socketRef.current.emit('chat_message', {
      message,
      sessionId: activeIdRef.current ?? undefined,
    });
  };

  const prompts = PROMPTS[audience];
  const online = status === 'ready' && aiReady !== false;
  const audienceLabel = useMemo(() => {
    if (audience === 'superadmin') return 'Superadmin';
    if (audience === 'central') return 'Markaziy apparat';
    return 'Filial';
  }, [audience]);

  return (
    <div className="flex h-[calc(100dvh-88px)] min-h-[560px] bg-background">
      <aside className="flex w-72 shrink-0 flex-col border-r border-border">
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <p className="text-sm font-medium text-foreground">Chatlar</p>
          <button
            type="button"
            onClick={startNewChat}
            disabled={isStreaming}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-foreground hover:bg-muted disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Yangi
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {sessions.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Hali chat yo‘q.</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={clsx(
                  'group mb-1 flex items-start gap-1 rounded-lg px-2 py-2',
                  session.id === activeId ? 'bg-muted' : 'hover:bg-muted/70',
                )}
              >
                <button
                  type="button"
                  onClick={() => openSession(session.id)}
                  disabled={isStreaming}
                  className="min-w-0 flex-1 text-left disabled:opacity-60"
                >
                  <p className="truncate text-sm text-foreground">{session.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {when(session.updatedAt)}
                  </p>
                </button>
                <button
                  type="button"
                  aria-label="Chatni o‘chirish"
                  onClick={() => removeSession(session.id)}
                  disabled={isStreaming}
                  className="mt-0.5 rounded-md p-1 text-muted-foreground opacity-0 hover:bg-background hover:text-foreground group-hover:opacity-100 disabled:opacity-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-end justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              ElektroLearn
            </p>
            <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-foreground">
              Tahlil
            </h1>
            <p className="mt-1 max-w-xl truncate text-sm text-muted-foreground">
              {audienceLabel}: {scopeLabel}
            </p>
          </div>
          <p className="shrink-0 text-xs text-muted-foreground">
            <span
              className={clsx(
                'mr-2 inline-block h-1.5 w-1.5 rounded-full',
                online ? 'bg-emerald-500' : 'bg-rose-500',
              )}
            />
            {online ? 'Tayyor' : aiReady === false ? 'Ulanmagan' : 'Kutilmoqda'}
          </p>
        </header>

        <div ref={viewportRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-8">
            {messages.length === 0 ? (
              <div className="pt-10">
                <p className="max-w-lg text-[28px] font-semibold leading-tight tracking-tight text-foreground">
                  Shu doiradagi raqamlar va hujjatlar bo‘yicha so‘rang.
                </p>
                <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                  Javob statistika, hisobot, 608-son, 609-son va tashakkurnomadan olinadi. Har bir suhbat alohida saqlanadi.
                </p>
                <div className="mt-8 flex flex-col border-t border-border">
                  {prompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={!online || isStreaming}
                      onClick={() => sendMessage(prompt)}
                      className="border-b border-border py-3 text-left text-sm text-foreground transition hover:text-primary disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={clsx(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  <p
                    className={clsx(
                      'max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-7',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground',
                    )}
                  >
                    {message.content ||
                      (isStreaming && message.id === messages[messages.length - 1]?.id
                        ? waitText || '…'
                        : '')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <form
          className="border-t border-border bg-background px-6 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage(draft);
          }}
        >
          <div className="mx-auto flex w-full max-w-3xl items-end gap-3">
            <textarea
              value={draft}
              rows={1}
              placeholder="Savol yozing"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage(draft);
                }
              }}
              className="max-h-32 min-h-12 flex-1 resize-none bg-transparent py-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={!draft.trim() || isStreaming || !online}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-30"
              aria-label="Yuborish"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
