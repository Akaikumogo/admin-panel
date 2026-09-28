import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button, Input, Modal, Switch, Textarea, message } from '@/components/ui';
import apiService, { resolveAssetUrl, type TelegramNewsItem } from '@/services/api';
import { errorMessage } from './newsShared';

const MAX_IMAGES = 10;
const CAPTION_LIMIT = 1024;
const BODY_LIMIT = 4000;

export default function NewsEditorModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** null = yangi news */
  editing: TelegramNewsItem | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [withAppButton, setWithAppButton] = useState(true);
  const [keep, setKeep] = useState<{ url: string; fileName: string }[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? '');
    setBody(editing?.body ?? '');
    setWithAppButton(editing?.withAppButton ?? true);
    setKeep(editing?.images ?? []);
    setFiles([]);
  }, [open, editing]);

  const filePreviews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => filePreviews.forEach((u) => URL.revokeObjectURL(u)), [filePreviews]);

  const totalImages = keep.length + files.length;

  const onPickFiles = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list).filter((f) => f.type.startsWith('image/'));
    const room = MAX_IMAGES - totalImages;
    if (picked.length > room) {
      message.warning(`Ko‘pi bilan ${MAX_IMAGES} ta rasm`);
    }
    setFiles((prev) => [...prev, ...picked.slice(0, Math.max(0, room))]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = async () => {
    if (!title.trim()) {
      message.error('Sarlavha kiriting');
      return;
    }
    if (!body.trim() && totalImages === 0) {
      message.error('Matn yoki kamida bitta rasm kerak');
      return;
    }
    const form = new FormData();
    form.append('title', title.trim());
    form.append('body', body);
    form.append('withAppButton', String(withAppButton));
    files.forEach((f) => form.append('images', f, f.name));
    setSaving(true);
    try {
      if (editing?.postId) {
        form.append('keepImages', JSON.stringify(keep.map((k) => k.url)));
        await apiService.updateTelegramNewsPost(editing.postId, form);
        message.success('News saqlandi');
      } else {
        await apiService.createTelegramNewsPost(form);
        message.success('News yaratildi');
      }
      await onSaved();
      onClose();
    } catch (err) {
      message.error(errorMessage(err, 'Saqlab boʻlmadi'));
    } finally {
      setSaving(false);
    }
  };

  const longWithImages = totalImages > 0 && body.trim().length > CAPTION_LIMIT;
  const alreadySent = !!editing && editing.sent > 0;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={680}
      title={editing ? 'Newsni tahrirlash' : 'Yangi news'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Bekor qilish
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? 'Saqlanmoqda…' : 'Saqlash'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {alreadySent ? (
          <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Bu news {editing?.sent} ta chatga yuborilgan. Oʻzgarishlar faqat hali olmaganlarga boradi.
          </p>
        ) : null}

        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Sarlavha (faqat admin panelda koʻrinadi)</label>
          <Input
            value={title}
            maxLength={200}
            placeholder="Masalan: Oktyabr yangiliklari"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">Matn</label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {body.length}/{BODY_LIMIT}
            </span>
          </div>
          <Textarea
            rows={8}
            maxLength={BODY_LIMIT}
            value={body}
            placeholder="Telegramda odamlarga boradigan matn…"
            onChange={(e) => setBody(e.target.value)}
          />
          {longWithImages ? (
            <p className="text-xs text-muted-foreground">
              Matn {CAPTION_LIMIT} belgidan uzun — rasm(lar)dan keyin alohida xabar boʻlib boradi.
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">Rasmlar</label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {totalImages}/{MAX_IMAGES}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {keep.map((img) => (
              <Thumb
                key={img.url}
                src={resolveAssetUrl(img.url)}
                onRemove={() => setKeep((prev) => prev.filter((k) => k.url !== img.url))}
              />
            ))}
            {filePreviews.map((src, i) => (
              <Thumb
                key={src}
                src={src}
                onRemove={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
              />
            ))}
            {totalImages < MAX_IMAGES ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-muted"
              >
                <ImagePlus className="h-5 w-5" />
                Rasm qoʻshish
              </button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => onPickFiles(e.target.files)}
          />
          <p className="text-xs text-muted-foreground">
            Bir nechta rasm Telegramda albom boʻlib boradi. Har biri 10 MB gacha.
          </p>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
          <span>
            <span className="block text-sm font-medium">«Ilovani ochish» tugmasi</span>
            <span className="block text-xs text-muted-foreground">
              Xabar ostida Elektro Learn ilovasiga havola tugmasi
            </span>
          </span>
          <Switch checked={withAppButton} onCheckedChange={setWithAppButton} />
        </label>
      </div>
    </Modal>
  );
}

function Thumb({ src, onRemove }: { src: string; onRemove: () => void }) {
  return (
    <div className="relative">
      <img src={src} alt="" className="aspect-square w-full rounded-lg border border-border object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="O‘chirish"
        className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
