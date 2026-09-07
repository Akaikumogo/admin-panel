import { useCallback, useRef, useState, type MouseEvent } from 'react';
import { Camera, Loader2, Trash2, Upload } from 'lucide-react';
import { Avatar, Button, message } from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { validateEmployeeAvatar } from '@/lib/avatar-validation';
import apiService, { resolveAssetUrl } from '@/services/api';

const T = {
  imagesOnly: {
    uz: 'Faqat rasm yuklash mumkin',
    en: 'Images only',
    ru: 'Только изображения',
  },
  maxSize: {
    uz: 'Rasm 5 MB dan katta bo‘lmasin',
    en: 'Max size is 5 MB',
    ru: 'Максимум 5 МБ',
  },
  noFace: {
    uz: 'Rasmda yuz aniqlanmadi. Yuz aniq ko‘rinadigan rasm yuklang.',
    en: 'No face detected. Upload a clear face photo.',
    ru: 'Лицо не найдено. Загрузите фото с чётким лицом.',
  },
  notWhiteBg: {
    uz: 'Orqa fon oq bo‘lishi kerak. Oq fondagi rasm yuklang.',
    en: 'Background must be white. Upload a white-background photo.',
    ru: 'Фон должен быть белым. Загрузите фото на белом фоне.',
  },
  loadError: {
    uz: 'Rasmni o‘qib bo‘lmadi',
    en: 'Could not read image',
    ru: 'Не удалось прочитать изображение',
  },
  ok: {
    uz: 'Rasm saqlandi',
    en: 'Photo saved',
    ru: 'Фото сохранено',
  },
  deleted: {
    uz: 'Rasm o‘chirildi',
    en: 'Photo deleted',
    ru: 'Фото удалено',
  },
  error: {
    uz: 'Yuklashda xatolik',
    en: 'Upload failed',
    ru: 'Ошибка загрузки',
  },
  deleteError: {
    uz: 'O‘chirishda xatolik',
    en: 'Delete failed',
    ru: 'Ошибка удаления',
  },
  hint: {
    uz: 'Rasm yuklash',
    en: 'Upload photo',
    ru: 'Загрузить фото',
  },
  change: {
    uz: 'Yuklash / almashtirish',
    en: 'Upload / replace',
    ru: 'Загрузить / заменить',
  },
  remove: {
    uz: 'O‘chirish',
    en: 'Delete',
    ru: 'Удалить',
  },
  rulesTitle: {
    uz: 'Rasm shartlari',
    en: 'Photo requirements',
    ru: 'Требования к фото',
  },
  rule1: {
    uz: 'Format: JPG, PNG, WEBP yoki GIF',
    en: 'Format: JPG, PNG, WEBP or GIF',
    ru: 'Формат: JPG, PNG, WEBP или GIF',
  },
  rule2: {
    uz: 'Hajm: eng ko‘pi 5 MB',
    en: 'Size: max 5 MB',
    ru: 'Размер: максимум 5 МБ',
  },
  rule3: {
    uz: 'Yuz aniq ko‘rinsin (passport/guvohnoma uslubi)',
    en: 'Face must be clearly visible (ID-style)',
    ru: 'Лицо должно быть чётко видно',
  },
  rule4: {
    uz: 'Orqa fon oq bo‘lishi shart',
    en: 'White background is required',
    ru: 'Белый фон обязателен',
  },
  rule5: {
    uz: 'Bir kishi — oldindan, qorong‘u/blur bo‘lmasin',
    en: 'One person, front-facing, not dark/blurry',
    ru: 'Один человек, анфас, без размытия',
  },
} as const;

type Props = {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
  /** compact = jadval; panel = detail + shartlar */
  variant?: 'compact' | 'panel';
  onUploaded?: (avatarUrl: string) => void;
  onDeleted?: () => void;
};

export function EmployeeAvatarUpload({
  userId,
  firstName,
  lastName,
  avatarUrl,
  size = 36,
  className,
  variant = 'compact',
  onUploaded,
  onDeleted,
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'delete' | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null | undefined>(undefined);

  const displaySrc =
    localUrl === undefined
      ? avatarUrl
        ? resolveAssetUrl(avatarUrl)
        : undefined
      : localUrl
        ? resolveAssetUrl(localUrl)
        : undefined;

  const hasPhoto = Boolean(displaySrc);
  const initials = (firstName?.[0] || '') + (lastName?.[0] || '');

  const stopRowNav = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handlePick = useCallback(
    (e?: MouseEvent) => {
      e?.stopPropagation();
      if (busy) return;
      inputRef.current?.click();
    },
    [busy],
  );

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        void message.error(t(T.imagesOnly));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        void message.error(t(T.maxSize));
        return;
      }

      setBusy('upload');
      try {
        const validation = await validateEmployeeAvatar(file);
        if (!validation.ok) {
          if (validation.reason === 'no_face') {
            void message.error(t(T.noFace));
          } else if (validation.reason === 'not_white_bg') {
            void message.error(t(T.notWhiteBg));
          } else {
            void message.error(t(T.loadError));
          }
          return;
        }

        const result = await apiService.uploadUserAvatar(userId, file, {
          hasFace: true,
          faceConfidence: validation.faceConfidence,
        });
        setLocalUrl(result.avatarUrl);
        onUploaded?.(result.avatarUrl);
        void message.success(t(T.ok));
      } catch {
        void message.error(t(T.error));
      } finally {
        setBusy(null);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [onUploaded, t, userId],
  );

  const handleDelete = useCallback(
    async (e?: MouseEvent) => {
      e?.stopPropagation();
      if (busy || !hasPhoto) return;
      if (
        !window.confirm(
          t({
            uz: 'Rasm o‘chirilsinmi?',
            en: 'Delete this photo?',
            ru: 'Удалить фото?',
          }),
        )
      ) {
        return;
      }
      setBusy('delete');
      try {
        await apiService.deleteUserAvatar(userId);
        setLocalUrl(null);
        onDeleted?.();
        void message.success(t(T.deleted));
      } catch {
        void message.error(t(T.deleteError));
      } finally {
        setBusy(null);
      }
    },
    [busy, hasPhoto, onDeleted, t, userId],
  );

  const avatarBtn = (
    <button
      type="button"
      data-stop-row-click
      title={t(T.hint)}
      aria-label={t(T.hint)}
      onClick={handlePick}
      onMouseDown={stopRowNav}
      onPointerDown={stopRowNav}
      disabled={!!busy}
      className={cn(
        'group relative inline-flex shrink-0 cursor-pointer rounded-full',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-wait',
        className,
      )}
    >
      <Avatar
        size={size}
        src={displaySrc}
        className="bg-gradient-to-br from-slate-600 to-slate-800"
      >
        {initials}
      </Avatar>
      <span
        className={cn(
          'pointer-events-none absolute inset-0 flex items-center justify-center rounded-full',
          'bg-black/45 text-white opacity-0 transition-opacity',
          'group-hover:opacity-100 group-focus-visible:opacity-100',
          busy && 'opacity-100',
        )}
      >
        {busy ? (
          <Loader2 size={Math.max(12, size * 0.4)} className="animate-spin" />
        ) : (
          <Camera size={Math.max(12, size * 0.4)} />
        )}
      </span>
    </button>
  );

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      className="hidden"
      onChange={(e) => void handleFile(e.target.files?.[0])}
    />
  );

  if (variant === 'compact') {
    return (
      <>
        {avatarBtn}
        {fileInput}
      </>
    );
  }

  return (
    <div
      className={cn('flex flex-col items-start gap-3', className)}
      data-stop-row-click
      onMouseDown={stopRowNav}
      onPointerDown={stopRowNav}
      onClick={stopRowNav}
    >
      <div className="flex items-start gap-4">
        {avatarBtn}
        <div className="flex min-w-0 flex-col gap-2 pt-1">
          <div className="flex flex-wrap gap-2">
            <Button
              type="default"
              size="small"
              icon={<Upload size={14} />}
              loading={busy === 'upload'}
              disabled={!!busy}
              onClick={() => handlePick()}
            >
              {t(T.change)}
            </Button>
            {hasPhoto ? (
              <Button
                type="default"
                danger
                size="small"
                icon={<Trash2 size={14} />}
                loading={busy === 'delete'}
                disabled={!!busy}
                onClick={() => void handleDelete()}
              >
                {t(T.remove)}
              </Button>
            ) : null}
          </div>
          <div className="rounded-lg border border-border/80 bg-slate-50/80 px-3 py-2 dark:bg-slate-900/40">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(T.rulesTitle)}
            </p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[11px] leading-snug text-slate-600 dark:text-slate-300">
              <li>{t(T.rule1)}</li>
              <li>{t(T.rule2)}</li>
              <li>{t(T.rule3)}</li>
              <li>{t(T.rule4)}</li>
              <li>{t(T.rule5)}</li>
            </ul>
          </div>
        </div>
      </div>
      {fileInput}
    </div>
  );
}
