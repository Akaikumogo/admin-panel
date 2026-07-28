import { useCallback, useRef, useState, type MouseEvent } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar, message } from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { validateEmployeeAvatar } from '@/lib/avatar-validation';
import apiService, { BACKEND_ORIGIN } from '@/services/api';

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
    uz: 'Avatar yangilandi',
    en: 'Avatar updated',
    ru: 'Аватар обновлён',
  },
  error: {
    uz: 'Yuklashda xatolik',
    en: 'Upload failed',
    ru: 'Ошибка загрузки',
  },
  hint: {
    uz: 'Rasm yuklash (oq fon, yuzli)',
    en: 'Upload photo (white bg, face)',
    ru: 'Загрузить фото (белый фон, лицо)',
  },
} as const;

type Props = {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
  onUploaded?: (avatarUrl: string) => void;
};

export function EmployeeAvatarUpload({
  userId,
  firstName,
  lastName,
  avatarUrl,
  size = 36,
  className,
  onUploaded,
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  const displaySrc =
    localUrl ??
    (avatarUrl ? `${BACKEND_ORIGIN}${avatarUrl}` : undefined);

  const initials =
    (firstName?.[0] || '') + (lastName?.[0] || '');

  const handlePick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (uploading) return;
      inputRef.current?.click();
    },
    [uploading],
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

      setUploading(true);
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
        setLocalUrl(`${BACKEND_ORIGIN}${result.avatarUrl}`);
        onUploaded?.(result.avatarUrl);
        void message.success(t(T.ok));
      } catch {
        void message.error(t(T.error));
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [onUploaded, t, userId],
  );

  return (
    <>
      <button
        type="button"
        title={t(T.hint)}
        aria-label={t(T.hint)}
        onClick={handlePick}
        disabled={uploading}
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
            uploading && 'opacity-100',
          )}
        >
          {uploading ? (
            <Loader2 size={Math.max(12, size * 0.4)} className="animate-spin" />
          ) : (
            <Camera size={Math.max(12, size * 0.4)} />
          )}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </>
  );
}
