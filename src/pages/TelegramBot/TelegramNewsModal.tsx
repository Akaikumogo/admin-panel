import { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone, Send, TestTube2 } from 'lucide-react';
import { Button, Modal, Popconfirm, Select, Tag, message } from '@/components/ui';
import apiService, {
  type TelegramBotChat,
  type TelegramNewsItem,
  type TelegramNewsResponse,
} from '@/services/api';

const TEST_CHAT_STORAGE_KEY = 'tg_news_test_chat';

function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: unknown } } })?.response?.data;
  const msg = data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return typeof msg === 'string' && msg ? msg : fallback;
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SlidePreviews({ item }: { item: TelegramNewsItem }) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    (async () => {
      const next: string[] = [];
      for (let i = 0; i < item.slides; i++) {
        try {
          const blob = await apiService.getTelegramNewsSlide(item.key, i);
          const url = URL.createObjectURL(blob);
          created.push(url);
          next.push(url);
        } catch {
          next.push('');
        }
      }
      if (!cancelled) setUrls(next);
    })();
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [item.key, item.slides]);

  return (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: item.slides }).map((_, i) =>
        urls[i] ? (
          <a key={i} href={urls[i]} target="_blank" rel="noreferrer">
            <img
              src={urls[i]}
              alt={`Slayd ${i + 1}`}
              className="aspect-square w-full rounded-lg border border-border object-cover"
            />
          </a>
        ) : (
          <div
            key={i}
            className="aspect-square w-full animate-pulse rounded-lg border border-border bg-muted"
          />
        ),
      )}
    </div>
  );
}

function NewsCard({
  item,
  testChatId,
  onChanged,
}: {
  item: TelegramNewsItem;
  testChatId: string | null;
  onChanged: () => Promise<void>;
}) {
  const [testing, setTesting] = useState(false);
  const [starting, setStarting] = useState(false);

  const onTest = async () => {
    if (!testChatId) return;
    setTesting(true);
    try {
      await apiService.sendTelegramNewsTest(item.key, testChatId);
      message.success('Test yuborildi — Telegramni tekshiring');
      await onChanged();
    } catch (err) {
      message.error(errorMessage(err, 'Test yuborilmadi'));
    } finally {
      setTesting(false);
    }
  };

  const onBroadcast = async () => {
    setStarting(true);
    try {
      const res = await apiService.broadcastTelegramNews(item.key);
      message.success(`${res.total} ta chatga yuborish boshlandi`);
      await onChanged();
    } catch (err) {
      message.error(errorMessage(err, 'Yuborishni boshlab boʻlmadi'));
    } finally {
      setStarting(false);
    }
  };

  const broadcastBlockedReason = item.running
    ? 'Hozir yuborilmoqda…'
    : !item.hasSuccessfulTest
      ? 'Avval oʻzingizga test yuboring'
      : item.pending === 0
        ? 'Hamma chatlarga yuborilgan — qayta yuborilmaydi'
        : null;

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div>
        <div className="font-medium text-foreground">{item.title}</div>
        <div className="text-xs text-muted-foreground">{item.description}</div>
      </div>

      <SlidePreviews item={item} />

      <div className="flex flex-wrap gap-1.5 text-xs">
        <Tag color="success">Yuborildi: {item.sent}</Tag>
        <Tag color="default">Qoldi: {item.pending}</Tag>
        {item.blocked > 0 && <Tag color="warning">Botni bloklagan: {item.blocked}</Tag>}
        {item.failed > 0 && <Tag color="error">Xato: {item.failed}</Tag>}
        {item.running && <Tag color="processing">Yuborilmoqda…</Tag>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!testChatId || testing}
          onClick={() => void onTest()}
        >
          <TestTube2 className="mr-1.5 h-4 w-4" />
          {testing ? 'Yuborilmoqda…' : 'Oʻzimga test yuborish'}
        </Button>
        <Popconfirm
          title="Hammaga yuborilsinmi?"
          description={`${item.pending} ta chatga ${item.slides} ta rasm yuboriladi. Har bir chatga faqat bir marta boradi, ortga qaytarib boʻlmaydi.`}
          okText="Ha, hammaga yuborish"
          cancelText="Bekor qilish"
          onConfirm={onBroadcast}
          disabled={!!broadcastBlockedReason || starting}
        >
          <Button size="sm" disabled={!!broadcastBlockedReason || starting}>
            <Send className="mr-1.5 h-4 w-4" />
            Hammaga yuborish
          </Button>
        </Popconfirm>
        {broadcastBlockedReason && (
          <span className="text-xs text-muted-foreground">{broadcastBlockedReason}</span>
        )}
      </div>

      {item.history.length > 0 && (
        <div className="space-y-1 border-t border-border pt-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tarix
          </div>
          {item.history.map((h) => (
            <div key={h.id} className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">{formatDateTime(h.startedAt)}</span>
              <Tag color={h.mode === 'ALL' ? 'blue' : 'default'}>
                {h.mode === 'ALL' ? 'Hammaga' : 'Test'}
              </Tag>
              <Tag
                color={
                  h.status === 'DONE' ? 'success' : h.status === 'FAILED' ? 'error' : 'processing'
                }
              >
                {h.status === 'DONE' ? 'Tugadi' : h.status === 'FAILED' ? 'Xato' : 'Davom etmoqda'}
              </Tag>
              <span className="text-foreground">
                {h.mode === 'TEST'
                  ? h.testChatName || 'chat'
                  : `${h.sent}/${h.total} yuborildi${h.blocked ? `, ${h.blocked} block` : ''}${h.failed ? `, ${h.failed} xato` : ''}`}
              </span>
              {h.startedBy && <span className="text-muted-foreground">· {h.startedBy}</span>}
              {h.error && <span className="text-red-600">· {h.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TelegramNewsModal({
  open,
  onClose,
  chats,
}: {
  open: boolean;
  onClose: () => void;
  chats: TelegramBotChat[];
}) {
  const [data, setData] = useState<TelegramNewsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [testChatId, setTestChatId] = useState<string | null>(() =>
    localStorage.getItem(TEST_CHAT_STORAGE_KEY),
  );

  const privateChats = useMemo(
    () => chats.filter((c) => c.chatType === 'private' && c.isActive),
    [chats],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiService.getTelegramNews());
    } catch (err) {
      message.error(errorMessage(err, 'Yangiliklarni yuklab boʻlmadi'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const anyRunning = !!data?.items.some((i) => i.running);
  useEffect(() => {
    if (!open || !anyRunning) return;
    const id = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(id);
  }, [open, anyRunning, load]);

  const onPickChat = (value: string) => {
    setTestChatId(value || null);
    if (value) localStorage.setItem(TEST_CHAT_STORAGE_KEY, value);
    else localStorage.removeItem(TEST_CHAT_STORAGE_KEY);
  };

  const validTestChatId =
    testChatId && privateChats.some((c) => c.id === testChatId) ? testChatId : null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      title={
        <span className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Yangiliklarni Telegram orqali tarqatish
        </span>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Yangilik botga /start bosgan barcha shaxsiy chatlarga ({data?.recipients ?? '…'} ta)
          yuboriladi, guruhlarga yuborilmaydi. Hech narsa avtomatik yuborilmaydi: avval oʻzingizga
          test yuboring, keyin «Hammaga yuborish» ni bosing.
        </p>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Test uchun chat (oʻzingizning Telegram chatingiz)
          </label>
          <Select
            value={validTestChatId}
            onChange={onPickChat}
            allowClear
            placeholder="Chatni tanlang"
            options={privateChats.map((c) => ({
              value: c.id,
              label: `${c.displayName}${c.peerUsername ? ` (@${c.peerUsername})` : ''}`,
            }))}
            className="w-full"
          />
        </div>

        {loading && !data ? (
          <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>
        ) : (
          data?.items.map((item) => (
            <NewsCard key={item.key} item={item} testChatId={validTestChatId} onChanged={load} />
          ))
        )}
      </div>
    </Modal>
  );
}
