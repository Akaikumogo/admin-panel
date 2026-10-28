import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ArrowUp } from 'lucide-react';
import clsx from 'clsx';
import { BACKEND_ORIGIN } from '@/services/api';
import apiService from '@/services/api';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type Audience = 'superadmin' | 'central' | 'branch';

const PROMPTS: Record<Audience, string[]> = {
  superadmin: [
    'Oxirgi 7 kunda qaysi tashkilotda xato ko‘proq?',
    'Xavfsizlik yozuvlarida muddati o‘tgan joylar qayerda?',
    'Reja bo‘yicha to‘g‘ri javob qayerda past?',
  ],
  central: [
    'Markaziy apparatda oxirgi 7 kunda kim ko‘proq xato qilgan?',
    'Xavfsizlik yozuvlari bo‘yicha holat qanday?',
    'Qaysi savollar eng ko‘p xato qilinyapti?',
  ],
  branch: [
    'Shu filialda oxirgi 7 kunda eng ko‘p xato qilingan savollar?',
    'Kimlar ko‘proq xato qilyapti?',
    'Xavfsizlik yozuvlarida muddati o‘tganlari bormi?',
  ],
};

export default function AiAssistantPage() {
  const socketRef = useRef<Socket | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<'connecting' | 'ready' | 'error'>('connecting');
  const [isStreaming, setIsStreaming] = useState(false);
  const [audience, setAudience] = useState<Audience>('branch');
  const [scopeLabel, setScopeLabel] = useState('Yuklanmoqda');
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    apiService
      .getAiChatStatus()
      .then((s) => {
        setAiReady(s.ready);
        setAudience(s.audience);
        setScopeLabel(s.scopeLabel);
      })
      .catch(() => setAiReady(false));
  }, []);

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
    socket.on('assistant_started', () => {
      setIsStreaming(true);
      setMessages((prev) => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: 'assistant', content: '' },
      ]);
    });
    socket.on('assistant_chunk', ({ chunk }: { chunk?: string }) => {
      if (!chunk) return;
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (!last || last.role !== 'assistant') return next;
        next[next.length - 1] = { ...last, content: `${last.content}${chunk}` };
        return next;
      });
    });
    socket.on('assistant_done', () => setIsStreaming(false));
    socket.on('assistant_error', ({ message }: { message?: string }) => {
      setIsStreaming(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: message ?? 'AI bilan bog‘lanishda xato bo‘ldi.',
        },
      ]);
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

  const sendMessage = (text: string) => {
    const message = text.trim();
    if (!message || isStreaming || status !== 'ready' || !socketRef.current) return;
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: message },
    ]);
    setDraft('');
    socketRef.current.emit('chat_message', { message });
  };

  const prompts = PROMPTS[audience];
  const online = status === 'ready' && aiReady !== false;
  const audienceLabel = useMemo(() => {
    if (audience === 'superadmin') return 'Superadmin';
    if (audience === 'central') return 'Markaziy apparat';
    return 'Filial';
  }, [audience]);

  return (
    <div className="flex h-[calc(100dvh-88px)] min-h-[560px] flex-col bg-background">
      <header className="flex items-end justify-between gap-4 border-b border-border px-6 py-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            ElektroLearn
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-foreground">
            Tahlil
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
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
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-8">
          {messages.length === 0 ? (
            <div className="pt-10">
              <p className="max-w-lg text-[28px] font-semibold leading-tight tracking-tight text-foreground">
                Shu doiradagi raqamlar bo‘yicha so‘rang.
              </p>
              <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                Javob faqat sizga tegishli tashkilotlar, xato savollar va xavfsizlik yozuvlaridan olinadi. Boshqa mavzu jurnalga tushadi va bu yerda javobsiz qoladi.
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
              <article key={message.id} className="grid grid-cols-[88px_minmax(0,1fr)] gap-4">
                <p className="pt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {message.role === 'user' ? 'Siz' : 'Tahlil'}
                </p>
                <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">
                  {message.content || (isStreaming ? '…' : '')}
                </p>
              </article>
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-30"
            aria-label="Yuborish"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
