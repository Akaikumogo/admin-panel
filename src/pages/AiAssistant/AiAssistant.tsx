import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Bot, LoaderCircle, SendHorizonal, Sparkles, User } from 'lucide-react';
import clsx from 'clsx';
import { BACKEND_ORIGIN } from '@/services/api';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
};

const STARTER_PROMPTS = [
  'Qaysi savollar eng ko‘p xato qilinyapti?',
  'Oxirgi oyda qayerda eng ko‘p jon yo‘qotilgan?',
  'Qaysi foydalanuvchilar ko‘proq qiynalyapti?',
  'Moderator sifatida nimaga e’tibor beray?',
];

export default function AiAssistantPage() {
  const socketRef = useRef<Socket | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<'connecting' | 'ready' | 'error'>(
    'connecting',
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Admin AI tayyor. Men sizga xato savollar, jon yo‘qotishlar va umumiy tahlil bo‘yicha yordam bera olaman.',
    },
  ]);

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
    socket.on(
      'assistant_history',
      ({
        messages: history,
      }: {
        messages?: Array<{
          id: string;
          role: 'user' | 'assistant';
          content: string;
          createdAt: string;
        }>;
      }) => {
        if (!history?.length) return;
        setMessages(history);
      },
    );
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
    socket.on('assistant_done', ({ message }: { message?: string }) => {
      setIsStreaming(false);
      if (message?.trim()) return;
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant' && !last.content.trim()) {
          next[next.length - 1] = {
            ...last,
            content: 'AI bo‘sh javob qaytardi. Yana urinib ko‘ring.',
          };
        }
        return next;
      });
    });
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
    if (!message || isStreaming || !socketRef.current) return;
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: message },
    ]);
    setDraft('');
    socketRef.current.emit('chat_message', { message });
  };

  return (
    <div className="h-[calc(100vh-100px)] overflow-hidden p-6">
      <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-5 dark:border-slate-700/60">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Admin AI
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Xatolar, jon yo‘qotishlar va userlar bo‘yicha tez tahlil.
              </p>
              <span
                className={clsx(
                  'mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                  status === 'ready'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : status === 'error'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
                )}
              >
                {status === 'ready'
                  ? 'Ulandi'
                  : status === 'error'
                    ? 'Ulanmadi'
                    : 'Ulanmoqda'}
              </span>
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                disabled={isStreaming || status !== 'ready'}
                className="shrink-0 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-blue-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-100"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div ref={viewportRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/80 p-5 dark:bg-slate-950/40">
          {messages.map((message) => (
            <div
              key={message.id}
              className={clsx(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start',
              )}
            >
              <div
                className={clsx(
                  'max-w-[78%] rounded-3xl px-4 py-3 shadow-sm',
                  message.role === 'user'
                    ? 'rounded-br-md bg-slate-900 text-white dark:bg-blue-600'
                    : 'rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
                )}
              >
                <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold opacity-80">
                  {message.role === 'user' ? (
                    <>
                      <User className="h-3.5 w-3.5" />
                      Siz
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Admin AI
                    </>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6">
                  {message.content || (isStreaming ? '...' : '')}
                </p>
              </div>
            </div>
          ))}
          {isStreaming ? (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Javob tayyorlanyapti...
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-200 bg-white p-5 dark:border-slate-700/60 dark:bg-slate-900">
          <div className="flex items-end gap-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={1}
              placeholder="Masalan: qaysi savollarda tizimli muammo bor?"
              className="max-h-32 min-h-[52px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <button
              type="button"
              onClick={() => sendMessage(draft)}
              disabled={!draft.trim() || isStreaming || status !== 'ready'}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
            >
              <SendHorizonal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
