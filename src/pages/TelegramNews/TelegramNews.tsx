import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Pencil, Plus, RefreshCw, Send, Trash2, UserRound } from 'lucide-react';
import { Button, Popconfirm, Select, Spin, Tag, message } from '@/components/ui';
import { isSuperAdmin } from '@/utils/isSuperAdmin';
import apiService, {
  type TelegramBotChat,
  type TelegramNewsItem,
  type TelegramNewsResponse,
} from '@/services/api';
import NewsEditorModal from './NewsEditorModal';
import { NewsThumbs, errorMessage, formatDateTime } from './newsShared';

const TARGET_CHAT_STORAGE_KEY = 'tg_news_test_chat';

export default function TelegramNewsPage() {
  const navigate = useNavigate();
  const allowed = isSuperAdmin();
  const [data, setData] = useState<TelegramNewsResponse | null>(null);
  const [chats, setChats] = useState<TelegramBotChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetChatId, setTargetChatId] = useState<string | null>(() =>
    localStorage.getItem(TARGET_CHAT_STORAGE_KEY),
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<TelegramNewsItem | null>(null);

  useEffect(() => {
    if (!allowed) navigate('/dashboard/home', { replace: true });
  }, [allowed, navigate]);

  const load = useCallback(async () => {
    try {
      const [news, chatRows] = await Promise.all([
        apiService.getTelegramNews(),
        apiService.getTelegramBotChats(),
      ]);
      setData(news);
      setChats(chatRows);
    } catch (err) {
      message.error(errorMessage(err, 'Newslarni yuklab boʻlmadi'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  const anyRunning = !!data?.items.some((i) => i.running);
  useEffect(() => {
    if (!anyRunning) return;
    const id = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(id);
  }, [anyRunning, load]);

  const chatOptions = useMemo(
    () =>
      chats
        .filter((c) => c.isActive)
        .map((c) => {
          const isGroup = c.chatType === 'group' || c.chatType === 'supergroup';
          return {
            value: c.id,
            label: `${isGroup ? '👥 ' : ''}${c.displayName}${c.peerUsername ? ` (@${c.peerUsername})` : ''}`,
          };
        }),
    [chats],
  );
  const validTargetId =
    targetChatId && chatOptions.some((o) => o.value === targetChatId) ? targetChatId : null;
  const targetName = chatOptions.find((o) => o.value === validTargetId)?.label ?? null;

  const onPickChat = (value: string) => {
    setTargetChatId(value || null);
    if (value) localStorage.setItem(TARGET_CHAT_STORAGE_KEY, value);
    else localStorage.removeItem(TARGET_CHAT_STORAGE_KEY);
  };

  if (!allowed) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Megaphone size={20} className="text-[var(--shell-rail)]" />
            Telegram News
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Rasm va matn joylab, botga /start bosgan barcha shaxsiy chatlarga (
            {data?.recipients ?? '…'} ta) yoki bitta chatga yuboring. Hech narsa avtomatik
            yuborilmaydi. «Hammaga» har bir chatga faqat bir marta boradi.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Yangilash
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Yangi news
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <label className="mb-1 block text-xs text-muted-foreground">
          Kimga yuborish (bitta chat): oʻzingiz yoki biror odam
        </label>
        <Select
          value={validTargetId}
          onChange={onPickChat}
          allowClear
          placeholder="Chatni tanlang"
          options={chatOptions}
          className="w-full max-w-md"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          «Hammaga yuborish» faqat biror chatga (masalan oʻzingizga) muvaffaqiyatli yuborilgandan
          keyin ochiladi.
        </p>
      </div>

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center">
          <Spin size="large" />
        </div>
      ) : data?.items.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.items.map((item) => (
            <NewsCard
              key={item.key}
              item={item}
              targetChatId={validTargetId}
              targetName={targetName}
              onChanged={load}
              onEdit={() => {
                setEditing(item);
                setEditorOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Hali news yoʻq — «Yangi news» ni bosing
        </p>
      )}

      <NewsEditorModal
        open={editorOpen}
        editing={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={load}
      />
    </div>
  );
}

function NewsCard({
  item,
  targetChatId,
  targetName,
  onChanged,
  onEdit,
}: {
  item: TelegramNewsItem;
  targetChatId: string | null;
  targetName: string | null;
  onChanged: () => Promise<void>;
  onEdit: () => void;
}) {
  const [busy, setBusy] = useState<'send' | 'all' | 'delete' | null>(null);

  const onSend = async () => {
    if (!targetChatId) return;
    setBusy('send');
    try {
      await apiService.sendTelegramNewsToChat(item.key, targetChatId);
      message.success(`Yuborildi: ${targetName ?? 'chat'}`);
      await onChanged();
    } catch (err) {
      message.error(errorMessage(err, 'Yuborilmadi'));
    } finally {
      setBusy(null);
    }
  };

  const onBroadcast = async () => {
    setBusy('all');
    try {
      const res = await apiService.broadcastTelegramNews(item.key);
      message.success(`${res.total} ta chatga yuborish boshlandi`);
      await onChanged();
    } catch (err) {
      message.error(errorMessage(err, 'Yuborishni boshlab boʻlmadi'));
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async () => {
    if (!item.postId) return;
    setBusy('delete');
    try {
      await apiService.deleteTelegramNewsPost(item.postId);
      message.success('News oʻchirildi');
      await onChanged();
    } catch (err) {
      message.error(errorMessage(err, 'Oʻchirib boʻlmadi'));
    } finally {
      setBusy(null);
    }
  };

  const broadcastBlockedReason = item.running
    ? 'Hozir yuborilmoqda…'
    : !item.hasSuccessfulTest
      ? 'Avval biror chatga (oʻzingizga) yuborib koʻring'
      : item.pending === 0
        ? 'Hamma chatlarga yuborilgan'
        : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">{item.title}</span>
            {item.builtin ? <Tag color="blue">Tizim</Tag> : null}
          </div>
          <div className="text-xs text-muted-foreground">
            {item.builtin
              ? item.description
              : `${item.createdBy ?? '—'} · ${formatDateTime(item.createdAt)}`}
          </div>
        </div>
        {!item.builtin ? (
          <div className="flex shrink-0 gap-1">
            <Button variant="outline" size="sm" onClick={onEdit} disabled={item.running}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Popconfirm
              title="Newsni oʻchirasizmi?"
              description="Rasmlar va yuborish tarixi ham oʻchadi. Telegramga ketgan xabarlar qoladi."
              okText="Oʻchirish"
              cancelText="Bekor qilish"
              onConfirm={onDelete}
              disabled={item.running || busy === 'delete'}
            >
              <Button variant="outline" size="sm" disabled={item.running || busy === 'delete'}>
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </Popconfirm>
          </div>
        ) : null}
      </div>

      <NewsThumbs item={item} />

      {!item.builtin && item.body ? (
        <p className="line-clamp-6 whitespace-pre-wrap break-words rounded-md bg-muted/50 p-3 text-sm">
          {item.body}
        </p>
      ) : null}

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
          disabled={!targetChatId || busy === 'send'}
          onClick={() => void onSend()}
          title={targetName ? `→ ${targetName}` : 'Yuqorida chatni tanlang'}
        >
          <UserRound className="mr-1.5 h-4 w-4" />
          {busy === 'send' ? 'Yuborilmoqda…' : 'Tanlangan chatga'}
        </Button>
        <Popconfirm
          title="Hammaga yuborilsinmi?"
          description={`${item.pending} ta chatga yuboriladi. Har bir chatga faqat bir marta boradi, ortga qaytarib boʻlmaydi.`}
          okText="Ha, hammaga yuborish"
          cancelText="Bekor qilish"
          onConfirm={onBroadcast}
          disabled={!!broadcastBlockedReason || busy === 'all'}
        >
          <Button size="sm" disabled={!!broadcastBlockedReason || busy === 'all'}>
            <Send className="mr-1.5 h-4 w-4" />
            Hammaga yuborish
          </Button>
        </Popconfirm>
        {broadcastBlockedReason ? (
          <span className="text-xs text-muted-foreground">{broadcastBlockedReason}</span>
        ) : null}
      </div>

      {item.history.length > 0 ? (
        <div className="space-y-1 border-t border-border pt-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tarix
          </div>
          {item.history.slice(0, 6).map((h) => (
            <div key={h.id} className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">{formatDateTime(h.startedAt)}</span>
              <Tag color={h.mode === 'ALL' ? 'blue' : 'default'}>
                {h.mode === 'ALL' ? 'Hammaga' : 'Bitta chat'}
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
              {h.startedBy ? <span className="text-muted-foreground">· {h.startedBy}</span> : null}
              {h.error ? <span className="text-red-600">· {h.error}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
