import { useEffect, useState } from 'react';
import { Newspaper, Send } from 'lucide-react';
import { Button, Modal, Spin, Tag, message } from '@/components/ui';
import apiService, { type TelegramNewsItem } from '@/services/api';
import { NewsThumbs, errorMessage } from '../TelegramNews/newsShared';

/** Chat oynasidan tanlangan bitta chatga news yuborish. */
export default function NewsPickerModal({
  open,
  chatRowId,
  chatName,
  onClose,
  onSent,
}: {
  open: boolean;
  chatRowId: string | null;
  chatName: string;
  onClose: () => void;
  onSent: () => Promise<void> | void;
}) {
  const [items, setItems] = useState<TelegramNewsItem[] | null>(null);
  const [sendingKey, setSendingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setItems(null);
    apiService
      .getTelegramNews()
      .then((res) => setItems(res.items))
      .catch((err) => {
        message.error(errorMessage(err, 'Newslarni yuklab boʻlmadi'));
        setItems([]);
      });
  }, [open]);

  const send = async (item: TelegramNewsItem) => {
    if (!chatRowId) return;
    setSendingKey(item.key);
    try {
      await apiService.sendTelegramNewsToChat(item.key, chatRowId);
      message.success(`«${item.title}» yuborildi`);
      await onSent();
      onClose();
    } catch (err) {
      message.error(errorMessage(err, 'Yuborilmadi'));
    } finally {
      setSendingKey(null);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      title={
        <span className="flex items-center gap-2">
          <Newspaper className="h-5 w-5" />
          News yuborish → {chatName}
        </span>
      }
    >
      {items == null ? (
        <div className="flex h-40 items-center justify-center">
          <Spin />
        </div>
      ) : items.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          News yoʻq — Telegram News sahifasida yarating
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.key} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{item.title}</span>
                    {item.builtin ? <Tag color="blue">Tizim</Tag> : null}
                  </div>
                  {item.body ? (
                    <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
                      {item.body}
                    </p>
                  ) : item.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  disabled={!!sendingKey}
                  onClick={() => void send(item)}
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  {sendingKey === item.key ? 'Yuborilmoqda…' : 'Yuborish'}
                </Button>
              </div>
              <NewsThumbs item={item} size="sm" />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
