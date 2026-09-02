import { useEffect, useState, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { resolveAssetUrl } from '@/services/api';
import { CertificateQr } from './CertificateQr';
import { CertificateRibbons } from './CertificateRibbons';
import { tierFaceStyle } from './certificate-theme';
import { formatCardOrgTitle } from './org-title';
import { isGoldTier, resolvePositionTier, type PositionTier } from './position-tier';
import type { EmployeeCertificate } from './types';
import { UmetSeal } from './UmetSeal';
import {
  ID_CARD_FACE_CLASS,
  ID_CARD_PRINT_CLASS,
  ID_CARD_SCENE_CLASS,
  ID_CARD_SIZE_LABEL,
} from './id-card-dimensions';

export type CertificateCardSize = 'sm' | 'md' | 'lg';

/** Guvohnoma sarlavhasi — filialning to'liq nomi (bo'lmasa tashkilot nomi). */
function cardTitle(certificate: EmployeeCertificate) {
  return formatCardOrgTitle(
    certificate.branchName?.trim() || certificate.organizationTitle?.trim(),
  );
}

/** Barcha o'lchamlar — haqiqiy 8,5 × 5,5 sm. */
const SCENE_SIZE: Record<CertificateCardSize, string> = {
  sm: ID_CARD_SCENE_CLASS,
  md: ID_CARD_SCENE_CLASS,
  lg: ID_CARD_SCENE_CLASS,
};

export function formatCertificateDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${date.getFullYear()}`;
}

interface CertificateCardProps {
  certificate: EmployeeCertificate;
  /** Guvohnomadagi 3x4 rasm. Berilmasa — DTO dagi avatar ishlatiladi. */
  avatarUrl?: string | null;
  size?: CertificateCardSize;
  className?: string;
}

/** Bosilganda aylanadigan guvohnoma (old / orqa tomon). */
export function CertificateCard({
  certificate,
  avatarUrl,
  size = 'lg',
  className,
}: CertificateCardProps) {
  const [flipped, setFlipped] = useState(false);
  const photo = avatarUrl ?? certificate.avatarUrl;

  const toggleFlip = (e: MouseEvent) => {
    e.stopPropagation();
    setFlipped((v) => !v);
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 [perspective:1400px]',
        SCENE_SIZE[size],
        className,
      )}
    >
      <button
        type="button"
        className={cn(
          'relative border-0 p-0 bg-transparent cursor-pointer [perspective:1400px] drop-shadow-[0_16px_32px_rgba(0,0,0,0.45)]',
          ID_CARD_FACE_CLASS,
        )}
        onClick={toggleFlip}
        aria-pressed={flipped}
        aria-label={`${certificate.fullName} — guvohnoma${flipped ? ', orqa tomon' : ''}`}
      >
        <div
          className={cn(
            'absolute inset-0 [transform-style:preserve-3d] transition-transform duration-700 ease-[cubic-bezier(0.4,0.15,0.2,1)] will-change-transform',
            flipped && '[transform:rotateY(180deg)]',
          )}
        >
          <CertificateCardFront certificate={certificate} avatarUrl={photo} />
          <CertificateCardBack certificate={certificate} />
        </div>
      </button>

      <button
        type="button"
        className="border-0 bg-transparent text-xs font-semibold cursor-pointer rounded-sm px-3 py-[5px] text-slate-500 transition-colors hover:text-blue-600 hover:bg-blue-500/10 dark:text-slate-400 dark:hover:text-blue-400"
        onClick={toggleFlip}
        aria-hidden
        tabIndex={-1}
      >
        {flipped ? 'Old tomonga' : 'Aylantirish'}
      </button>

      <p className="m-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        {ID_CARD_SIZE_LABEL}
      </p>
    </div>
  );
}

/**
 * `flip` — 3D aylanadigan karta (ekranda).
 * `static` — oddiy oqim ichidagi karta.
 * `print` — chop etish uchun haqiqiy o'lcham, 85 x 55 mm (8,5 x 5,5 sm).
 */
type FaceVariant = 'flip' | 'static' | 'print';

const FACE_BASE =
  'overflow-hidden border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.2)] [container-type:inline-size]';

const FLIP_FACE =
  'absolute inset-0 [backface-visibility:hidden] [transform-style:preserve-3d] rounded-2xl';

const STATIC_FACE = cn('relative rounded-2xl', ID_CARD_FACE_CLASS);

const PRINT_FACE = cn('relative rounded-[3mm]', ID_CARD_PRINT_CLASS);

function faceClass(variant: FaceVariant, side: 'front' | 'back') {
  if (variant === 'print') return PRINT_FACE;
  if (variant === 'static') return STATIC_FACE;
  return cn(
    FLIP_FACE,
    side === 'front'
      ? '[transform:rotateY(0deg)_translateZ(1px)] z-[2]'
      : '[transform:rotateY(180deg)_translateZ(1px)] z-[1]',
  );
}

/**
 * Ichki qatlam. Padding aynan shu yerda bo'lishi shart:
 * cqw birliklari konteynerning content-box'iga nisbatan hisoblanadi,
 * shuning uchun konteynerning o'zida cqw padding bo'lsa — o'lcham buziladi.
 */
const FACE_INNER =
  'absolute inset-0 flex flex-col px-[3.4cqw] pt-[3cqw] pb-[2.8cqw]';

/** Guvohnoma old tomoni. */
export function CertificateCardFront({
  certificate,
  avatarUrl,
  variant = 'flip',
}: {
  certificate: EmployeeCertificate;
  avatarUrl?: string | null;
  variant?: FaceVariant;
}) {
  const tier = resolvePositionTier(certificate.positionTitle);
  const gold = isGoldTier(tier);

  return (
    <div
      className={cn(FACE_BASE, faceClass(variant, 'front'))}
      style={tierFaceStyle(tier, 'front')}
    >
      <CertificateRibbons tier={tier} />

      {/* Fon ustidagi yengil to'siq — matn doim o'qiladigan bo'lishi uchun */}
      <div
        className="absolute inset-x-0 top-0 h-[38%] pointer-events-none z-[1] [background:linear-gradient(180deg,rgba(4,16,28,0.7)_0%,rgba(4,16,28,0.3)_64%,transparent_100%)]"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[30%] pointer-events-none z-[1] [background:linear-gradient(0deg,rgba(4,16,28,0.62)_0%,rgba(4,16,28,0.24)_58%,transparent_100%)]"
        aria-hidden
      />

      {/* Beyj uchun tirqish */}
      <div
        className="absolute top-[1.6cqw] left-1/2 -translate-x-1/2 w-[9cqw] h-[1.5cqw] rounded-full bg-black/45 shadow-[inset_0_1px_2px_rgba(0,0,0,0.55)] z-[3]"
        aria-hidden
      />

      {/* Logotip — o'ng yuqori burchak */}
      <UmetSeal className="absolute top-[2.8cqw] right-[3.4cqw] z-[3] w-[12cqw]" />

      <StatusStamp status={certificate.status} />

      <div className={FACE_INNER}>
        {/* Sarlavha — filialning to'liq nomi */}
        <header className="relative z-[2] shrink-0 pt-[3cqw] pr-[13cqw] text-left">
          <p
            className={cn(
              'm-0 text-[2.95cqw] font-extrabold uppercase leading-snug tracking-tight line-clamp-2',
              gold && 'text-[var(--card-accent-2)]',
            )}
          >
            {cardTitle(certificate)}
          </p>
        </header>

        <div
          className="relative z-[2] mt-[2cqw] h-px w-full shrink-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          aria-hidden
        />

        {/* Asosiy qism: rasm | maydonlar | QR — uchtasi bir chiziqdan boshlanadi */}
        <div className="relative z-[2] flex min-h-0 items-start gap-[3.2cqw] pt-[5.5cqw]">
          <CardPhoto avatarUrl={avatarUrl} tier={tier} />

          <dl className="m-0 flex flex-1 min-w-0 flex-col gap-[2.8cqw] text-left">
            <CardField
              labelUz="Familiyasi"
              labelEn="Surname"
              value={certificate.lastName || '—'}
            />
            <CardField
              labelUz="Ismi"
              labelEn="Given name(s)"
              value={certificate.firstName || '—'}
            />
            <CardField
              labelUz="Otasining ismi"
              labelEn="Patronymic"
              value={certificate.middleName || '—'}
            />
            <CardField
              labelUz="Lavozimi"
              labelEn="Position"
              value={certificate.positionTitle || '—'}
              compact
            />
          </dl>

          {/* Kvadrat QR — eni rasm balandligiga teng, balandlik bo'yicha markazda */}
          <div className="w-[30cqw] shrink-0 self-center">
            <div className="aspect-square w-full rounded-[1cqw] bg-white p-[0.9cqw] shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
              <CertificateQr value={certificate.verifyUrl} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Guvohnoma orqa tomoni — qo'shimcha ma'lumotlar, xuddi shu fon. */
export function CertificateCardBack({
  certificate,
  variant = 'flip',
}: {
  certificate: EmployeeCertificate;
  variant?: FaceVariant;
}) {
  const tier = resolvePositionTier(certificate.positionTitle);

  return (
    <div
      className={cn(FACE_BASE, faceClass(variant, 'back'))}
      style={tierFaceStyle(tier, 'back')}
    >
      <CertificateRibbons tier={tier} />

      <div
        className="absolute inset-0 pointer-events-none z-[1] [background:linear-gradient(180deg,rgba(4,16,28,0.72)_0%,rgba(4,16,28,0.32)_34%,rgba(4,16,28,0.32)_66%,rgba(4,16,28,0.6)_100%)]"
        aria-hidden
      />

      <div className={cn(FACE_INNER, 'items-center justify-center')}>
        <UmetSeal className="relative z-[3] w-[32cqw]" />
      </div>

      <span className="absolute bottom-[3cqw] right-[3.8cqw] z-[3] text-[2.2cqw] font-semibold tracking-[0.06em] text-[var(--card-muted)]">
        № {certificate.certificateNumber}
      </span>
    </div>
  );
}

/** Bekor qilingan / muddati o'tgan guvohnomada ko'ndalang muhr. */
function StatusStamp({ status }: { status: EmployeeCertificate['status'] }) {
  if (status === 'VALID') return null;

  const label = status === 'REVOKED' ? 'BEKOR QILINGAN' : 'MUDDATI O‘TGAN';
  const tone =
    status === 'REVOKED'
      ? 'text-red-400/85 border-red-400/70'
      : 'text-amber-300/85 border-amber-300/70';

  return (
    <div
      className="absolute inset-0 z-[4] flex items-center justify-center pointer-events-none"
      aria-hidden
    >
      <span
        className={cn(
          'rotate-[-14deg] rounded-[1cqw] border-[0.5cqw] px-[3cqw] py-[1cqw] text-[4.4cqw] font-black tracking-[0.1em] backdrop-blur-[1px]',
          tone,
        )}
      >
        {label}
      </span>
    </div>
  );
}

/** Ikki tilli yorliq + qiymat. */
function CardField({
  labelUz,
  labelEn,
  value,
  accent = false,
  compact = false,
}: {
  labelUz: string;
  labelEn: string;
  value: string;
  accent?: boolean;
  /** Lavozim kabi uzun qiymatlar uchun kichikroq shrift. */
  compact?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="m-0 text-[1.75cqw] font-medium leading-tight text-[var(--card-muted)]">
        {labelUz} <span className="italic opacity-80">/ {labelEn}</span>
      </dt>
      <dd
        className={cn(
          'm-0 mt-[0.3cqw] font-bold leading-tight text-[var(--card-text)] break-words',
          compact ? 'text-[2.5cqw] line-clamp-2' : 'text-[3.1cqw] line-clamp-1',
          accent && 'text-[var(--card-role)]',
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

/** Chapdagi 3x4 rasm maydoni. */
function CardPhoto({
  avatarUrl,
  tier,
}: {
  avatarUrl?: string | null;
  tier: PositionTier;
}) {
  const frame =
    'w-[24cqw] shrink-0 self-start aspect-[4/5] rounded-[1cqw] overflow-hidden border-[0.5cqw] border-white/85 shadow-[0_3px_10px_rgba(0,0,0,0.4)]';

  const src = avatarUrl ? resolveAssetUrl(avatarUrl) : '';
  // `cors` — rasmga eksport uchun kerak; server CORS bermasa `plain` ga
  // tushamiz, shunda hech bo'lmasa rasm ekranda ko'rinadi.
  const [mode, setMode] = useState<'cors' | 'plain' | 'failed'>('cors');

  useEffect(() => setMode('cors'), [src]);

  if (src && mode !== 'failed') {
    return (
      <img
        key={mode}
        src={src}
        alt=""
        {...(mode === 'cors' ? { crossOrigin: 'anonymous' as const } : {})}
        onError={() => setMode((prev) => (prev === 'cors' ? 'plain' : 'failed'))}
        className={cn(frame, 'object-cover object-[center_top]')}
      />
    );
  }

  return (
    <div
      className={cn(
        frame,
        'flex items-end justify-center',
        '[background:radial-gradient(ellipse_90%_70%_at_50%_18%,rgba(255,255,255,0.16),transparent_70%),linear-gradient(165deg,rgba(255,255,255,0.12),rgba(0,0,0,0.28))]',
      )}
      aria-hidden
    >
      <PhotoSilhouette tier={tier} />
    </div>
  );
}

/** Odam rasmi uchun joy — siluet (placeholder). */
function PhotoSilhouette({ tier }: { tier: PositionTier }) {
  return (
    <svg
      viewBox="0 0 100 125"
      className={cn(
        'block h-[96%] w-[88%] fill-current drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]',
        isGoldTier(tier) ? 'text-[rgba(212,175,55,0.4)]' : 'text-white/32',
      )}
      preserveAspectRatio="xMidYMax meet"
    >
      <circle cx="50" cy="42" r="22" />
      <path d="M14 125 C14 96 30 80 50 80 C70 80 86 96 86 125 Z" />
    </svg>
  );
}
