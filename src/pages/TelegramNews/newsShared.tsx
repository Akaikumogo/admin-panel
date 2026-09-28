import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import apiService, { resolveAssetUrl, type TelegramNewsItem } from '@/services/api';

export function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: unknown } } })?.response?.data;
  const msg = data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return typeof msg === 'string' && msg ? msg : fallback;
}

export function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Tizim newsi rasmlari himoyalangan API'dan (blob), custom news rasmlari /uploads dan. */
export function NewsThumbs({
  item,
  size = 'md',
}: {
  item: TelegramNewsItem;
  size?: 'sm' | 'md';
}) {
  const [blobUrls, setBlobUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!item.builtin) return;
    let cancelled = false;
    const created: string[] = [];
    (async () => {
      const next: string[] = [];
      for (let i = 0; i < item.slides; i++) {
        try {
          const url = URL.createObjectURL(await apiService.getTelegramNewsSlide(item.key, i));
          created.push(url);
          next.push(url);
        } catch {
          next.push('');
        }
      }
      if (!cancelled) setBlobUrls(next);
    })();
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [item.builtin, item.key, item.slides]);

  const urls = item.builtin
    ? Array.from({ length: item.slides }, (_, i) => blobUrls[i] ?? '')
    : item.images.map((img) => resolveAssetUrl(img.url));
  if (!urls.length) return null;

  return (
    <div
      className={cn(
        'grid gap-2',
        size === 'sm' ? 'grid-cols-5' : 'grid-cols-3 sm:grid-cols-4',
      )}
    >
      {urls.map((src, i) =>
        src ? (
          <a key={`${src}-${i}`} href={src} target="_blank" rel="noreferrer">
            <img
              src={src}
              alt={`Rasm ${i + 1}`}
              className="aspect-square w-full rounded-lg border border-border object-cover"
              loading="lazy"
            />
          </a>
        ) : (
          <div
            key={`pad-${i}`}
            className="aspect-square w-full animate-pulse rounded-lg border border-border bg-muted"
          />
        ),
      )}
    </div>
  );
}
