import { useState, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { CertificateQr } from './CertificateQr';
import { CertificateRibbons } from './CertificateRibbons';
import { tierFaceStyle } from './certificate-theme';
import { isGoldTier, resolvePositionTier, type PositionTier } from './position-tier';
import type { EmployeeCertificate } from './types';
import { UmetLogo } from './UmetLogo';

const CERT_TITLE = 'Xodimning bilim sinovi guvohnomasi';

export type CertificateCardSize = 'sm' | 'md' | 'lg';

/** Guvohnoma gorizontal (landscape) — sahna kengligi. */
const SCENE_SIZE: Record<CertificateCardSize, string> = {
  sm: 'max-w-[260px]',
  md: 'max-w-[320px]',
  lg: 'w-full max-w-[440px]',
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
        className="relative w-full max-w-full aspect-[8/5] border-0 p-0 bg-transparent cursor-pointer [perspective:1400px] drop-shadow-[0_16px_32px_rgba(0,0,0,0.45)]"
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
    </div>
  );
}

/**
 * `flip` — 3D aylanadigan karta (ekranda).
 * `static` — oddiy oqim ichidagi karta.
 * `print` — chop etish uchun haqiqiy o'lcham, 96 x 60 mm.
 */
type FaceVariant = 'flip' | 'static' | 'print';

const FACE_BASE =
  'overflow-hidden border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.2)]';

const FLIP_FACE =
  'absolute inset-0 [backface-visibility:hidden] [transform-style:preserve-3d] rounded-2xl';

const STATIC_FACE = 'relative w-full aspect-[8/5] rounded-2xl';

const PRINT_FACE = 'relative w-[96mm] h-[60mm] rounded-[3mm]';

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
      <div
        className="absolute top-[3cqw] right-[3.4cqw] z-[3] flex items-center justify-center w-[12cqw] h-[12cqw] rounded-[1.4cqw] border border-white/20 bg-white/10 p-[0.9cqw] backdrop-blur-[1px]"
        aria-hidden
      >
        <UmetLogo size="100%" variant={gold ? 'gold' : 'light'} />
      </div>

      <StatusStamp status={certificate.status} />

      <div className={FACE_INNER}>
        <header className="relative z-[2] shrink-0 pt-[3.4cqw] pr-[13cqw] text-center">
          <p
            className={cn(
              'm-0 text-[3.35cqw] font-extrabold leading-tight tracking-tight line-clamp-1',
              gold && 'text-[var(--card-accent-2)]',
            )}
          >
            {certificate.organizationTitle}
          </p>
          {certificate.branchName && (
            <p className="mt-[0.7cqw] mb-0 text-[2.6cqw] font-semibold leading-tight text-[var(--card-muted)] line-clamp-1">
              {certificate.branchName}
            </p>
          )}
          <p className="mt-[0.9cqw] mb-0 text-[2.9cqw] font-bold leading-tight text-[var(--card-accent-2)] line-clamp-1">
            {CERT_TITLE}
          </p>
        </header>

        <div
          className="relative z-[2] mt-[2cqw] h-px w-full shrink-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          aria-hidden
        />

        {/* Asosiy qism: rasm | maydonlar | raqam + QR */}
        <div className="relative z-[2] flex flex-1 min-h-0 gap-[3cqw] pt-[2.4cqw]">
          <CardPhoto avatarUrl={avatarUrl} tier={tier} />

          <dl className="m-0 flex flex-1 min-w-0 flex-col justify-between py-[0.3cqw]">
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
              accent
            />
          </dl>

          <div className="flex w-[22cqw] shrink-0 flex-col items-center text-center">
            <span className="text-[1.95cqw] font-semibold leading-tight text-[var(--card-muted)]">
              Guvohnoma raqami
            </span>
            <span className="text-[1.7cqw] italic leading-tight text-[var(--card-muted)] opacity-80">
              Certificate number
            </span>
            <span className="mt-[0.6cqw] text-[4.7cqw] font-black leading-none tracking-wide text-[var(--card-number)] [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
              {certificate.certificateNumber}
            </span>

            <div className="mt-[1.4cqw] h-[17cqw] w-[17cqw] rounded-[1cqw] bg-white p-[0.8cqw] shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
              <CertificateQr value={certificate.verifyUrl} />
            </div>
            <span className="mt-[0.7cqw] text-[1.7cqw] leading-tight text-[var(--card-muted)]">
              Scan to verify
            </span>
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

      <div className={FACE_INNER}>
        <div className="relative z-[3] flex shrink-0 items-baseline justify-between gap-[2cqw] pt-[3.4cqw]">
          <span className="text-[2.6cqw] font-extrabold uppercase tracking-[0.16em] text-[var(--card-accent-2)]">
            Guvohnoma / Certificate
          </span>
          <span className="text-[2.8cqw] font-black text-[var(--card-number)]">
            № {certificate.certificateNumber}
          </span>
        </div>

        <div
          className="relative z-[3] mt-[1.6cqw] h-px w-full shrink-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          aria-hidden
        />

        <div className="relative z-[3] flex flex-1 min-h-0 gap-[3.5cqw] pt-[2.6cqw]">
          <dl className="m-0 flex flex-1 min-w-0 flex-col justify-between py-[0.4cqw]">
            <BackRow label="F.I.Sh" value={certificate.fullName || '—'} />
            <BackRow label="Lavozim" value={certificate.positionTitle || '—'} />
            {certificate.personnelNumber && (
              <BackRow label="Tabel №" value={certificate.personnelNumber} />
            )}
            <BackRow
              label="Berilgan"
              value={formatCertificateDate(certificate.issuedAt)}
            />
            <BackRow
              label="Amal muddati"
              value={formatCertificateDate(certificate.validUntil)}
            />
          </dl>

          <div className="flex w-[27cqw] shrink-0 flex-col items-center justify-end pb-[1.4cqw]">
            <div
              className="w-full border-b border-dashed border-white/40"
              aria-hidden
            />
            <span className="mt-[0.9cqw] text-[1.9cqw] leading-tight text-[var(--card-muted)]">
              Imzo / Signature
            </span>
          </div>
        </div>

        <p className="relative z-[3] m-0 shrink-0 pt-[1.4cqw] text-center text-[1.8cqw] leading-snug text-[var(--card-muted)]">
          Haqiqiyligini QR kod orqali tekshiring.
        </p>
      </div>
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
}: {
  labelUz: string;
  labelEn: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="m-0 text-[1.85cqw] font-medium leading-tight text-[var(--card-muted)]">
        {labelUz} <span className="italic opacity-80">/ {labelEn}</span>
      </dt>
      <dd
        className={cn(
          'm-0 mt-[0.35cqw] text-[3.3cqw] font-bold leading-tight text-[var(--card-text)] line-clamp-1 break-words',
          accent && 'text-[var(--card-role)]',
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function BackRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[17cqw_1fr] items-start gap-[1.4cqw]">
      <dt className="m-0 text-[1.75cqw] font-bold uppercase leading-tight tracking-wide text-[var(--card-muted)] opacity-85">
        {label}
      </dt>
      <dd className="m-0 text-[2.15cqw] font-bold leading-tight text-[var(--card-text)] line-clamp-2 break-words">
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
    'w-[23cqw] shrink-0 self-start aspect-[4/5] rounded-[1cqw] overflow-hidden border-[0.5cqw] border-white/85 shadow-[0_3px_10px_rgba(0,0,0,0.4)]';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        crossOrigin="anonymous"
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
