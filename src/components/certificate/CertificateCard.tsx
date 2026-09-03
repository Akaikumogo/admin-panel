import { useEffect, useState, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { resolveAssetUrl } from '@/services/api';
import { CardBackdropV1, V1_FACE_STYLE } from './CardBackdropV1';
import { CertificateQr } from './CertificateQr';
import { CertificateRibbons } from './CertificateRibbons';
import { tierFaceStyle } from './certificate-theme';
import { formatV1BranchLabel, SHORT_ORG_TITLE } from './org-title';
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
export type CertificateCardDesign = 'v1' | 'v2';

const ORG_LINE = `"O'zbekiston milliy elektr tarmoqlari" AJ`;
const CERT_TITLE_V1 = 'Xodimning bilim sinovi guvohnomasi';

/** V2 sarlavha — filial to‘liq nomi; markaziy apparatda qisqa MET. */
function cardTitle(certificate: EmployeeCertificate) {
  return (
    formatV1BranchLabel(
      certificate.branchName?.trim() || certificate.organizationTitle?.trim(),
    ) || SHORT_ORG_TITLE
  );
}

function branchLine(certificate: EmployeeCertificate) {
  return formatV1BranchLabel(
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
  /** Asosiy dizayn — v1 (rasm). Eski ribbon dizayn — v2. */
  design?: CertificateCardDesign;
  className?: string;
}

/** Bosilganda aylanadigan guvohnoma (old / orqa tomon). */
export function CertificateCard({
  certificate,
  avatarUrl,
  size = 'lg',
  design = 'v1',
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
          <CertificateCardFront
            certificate={certificate}
            avatarUrl={photo}
            design={design}
          />
          <CertificateCardBack certificate={certificate} design={design} />
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

const FACE_INNER_V1 =
  'absolute inset-0 flex flex-col px-[3.2cqw] pt-[2.4cqw] pb-[2.4cqw]';

type FaceProps = {
  certificate: EmployeeCertificate;
  avatarUrl?: string | null;
  variant?: FaceVariant;
  design?: CertificateCardDesign;
};

/** Guvohnoma old tomoni. */
export function CertificateCardFront({
  certificate,
  avatarUrl,
  variant = 'flip',
  design = 'v1',
}: FaceProps) {
  if (design === 'v1') {
    return (
      <CertificateCardFrontV1
        certificate={certificate}
        avatarUrl={avatarUrl}
        variant={variant}
      />
    );
  }
  return (
    <CertificateCardFrontV2
      certificate={certificate}
      avatarUrl={avatarUrl}
      variant={variant}
    />
  );
}

/** Guvohnoma orqa tomoni. */
export function CertificateCardBack({
  certificate,
  variant = 'flip',
  design = 'v1',
}: Omit<FaceProps, 'avatarUrl'>) {
  if (design === 'v1') {
    return <CertificateCardBackV1 certificate={certificate} variant={variant} />;
  }
  return <CertificateCardBackV2 certificate={certificate} variant={variant} />;
}

/* ─────────────────────────── Variant 1 (asosiy) ─────────────────────────── */

function CertificateCardFrontV1({
  certificate,
  avatarUrl,
  variant = 'flip',
}: {
  certificate: EmployeeCertificate;
  avatarUrl?: string | null;
  variant?: FaceVariant;
}) {
  return (
    <div
      className={cn(FACE_BASE, faceClass(variant, 'front'), 'border-[#061018]')}
      style={V1_FACE_STYLE}
    >
      <CardBackdropV1 />

      {/* Beyj tirqishi */}
      <div
        className="absolute top-[1.4cqw] left-1/2 z-[3] h-[1.6cqw] w-[9.5cqw] -translate-x-1/2 rounded-full bg-white/95 shadow-[0_0_0_0.35cqw_rgba(0,0,0,0.35)]"
        aria-hidden
      />

      {/* Logo — dumaloq; JPG oq chetini scale bilan kesamiz */}
      <div className="absolute top-[2.6cqw] right-[2.8cqw] z-[3] h-[11cqw] w-[11cqw] overflow-hidden rounded-full">
        <img
          src="/umet-logo.jpg"
          alt=""
          className="h-full w-full scale-[1.28] object-cover"
          draggable={false}
        />
      </div>

      <StatusStamp status={certificate.status} />

      <div className={FACE_INNER_V1}>
        <header className="relative z-[2] shrink-0 pr-[12cqw] pt-[2.2cqw] text-center">
          <p className="m-0 text-[2.55cqw] font-bold leading-tight tracking-tight text-white">
            {ORG_LINE}
          </p>
          {branchLine(certificate) ? (
            <p className="m-0 mt-[0.5cqw] text-[2.15cqw] font-medium leading-tight text-white/90">
              {branchLine(certificate)}
            </p>
          ) : null}
          <p className="m-0 mt-[0.7cqw] text-[3.05cqw] font-extrabold leading-tight text-[#27AE60]">
            {CERT_TITLE_V1}
          </p>
        </header>

        <div
          className="relative z-[2] mt-[1.6cqw] h-px w-full shrink-0 bg-gradient-to-r from-transparent via-sky-200/55 to-transparent"
          aria-hidden
        />

        <div className="relative z-[2] flex min-h-0 flex-1 items-stretch gap-[2.8cqw] pt-[2.4cqw]">
          <CardPhoto avatarUrl={avatarUrl} tier="employee" frame="v1" />

          <dl className="m-0 flex min-w-0 flex-1 flex-col justify-between gap-[1.4cqw] py-[0.4cqw] text-left">
            <CardField
              labelUz="Familiyasi"
              labelEn="Surname"
              value={certificate.lastName || '—'}
              mutedClass="text-[#B8C9D4]"
            />
            <CardField
              labelUz="Ismi"
              labelEn="Given name(s)"
              value={certificate.firstName || '—'}
              mutedClass="text-[#B8C9D4]"
            />
            <CardField
              labelUz="Otasining ismi"
              labelEn="Patronymic"
              value={certificate.middleName || '—'}
              mutedClass="text-[#B8C9D4]"
            />
            <CardField
              labelUz="Lavozimi"
              labelEn="Position"
              value={certificate.positionTitle || '—'}
              compact
              mutedClass="text-[#B8C9D4]"
            />
          </dl>

          <div className="flex w-[28cqw] shrink-0 flex-col items-end justify-between">
            <div className="w-full text-right">
              <p className="m-0 text-[1.65cqw] font-medium leading-tight text-[#B8C9D4]">
                Guvohnoma raqami{' '}
                <span className="italic opacity-80">/ Certificate number</span>
              </p>
              <p className="m-0 mt-[0.4cqw] text-[4.2cqw] font-extrabold leading-none tracking-wide text-[#F2C94C]">
                {certificate.certificateNumber || '—'}
              </p>
            </div>

            <div className="flex w-full flex-col items-center">
              <div className="aspect-square w-full rounded-[1cqw] bg-white p-[0.85cqw] shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
                <CertificateQr value={certificate.verifyUrl} />
              </div>
              <p className="m-0 mt-[0.7cqw] text-[1.7cqw] font-medium tracking-wide text-[#B8C9D4]">
                Scan to verify
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CertificateCardBackV1({
  certificate,
  variant = 'flip',
}: {
  certificate: EmployeeCertificate;
  variant?: FaceVariant;
}) {
  return (
    <div
      className={cn(FACE_BASE, faceClass(variant, 'back'), 'border-[#061018]')}
      style={V1_FACE_STYLE}
    >
      <CardBackdropV1 />
      <div className={cn(FACE_INNER_V1, 'items-center justify-center')}>
        <div className="relative z-[3] h-[34cqw] w-[34cqw] overflow-hidden rounded-full">
          <img
            src="/umet-logo.jpg"
            alt=""
            className="h-full w-full scale-[1.28] object-cover"
            draggable={false}
          />
        </div>
      </div>
      <span className="absolute bottom-[3cqw] right-[3.8cqw] z-[3] text-[2.2cqw] font-semibold tracking-[0.06em] text-[#B8C9D4]">
        № {certificate.certificateNumber}
      </span>
    </div>
  );
}

/* ─────────────────────────── Variant 2 (eski) ─────────────────────────── */

function CertificateCardFrontV2({
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

      <div
        className="absolute inset-x-0 top-0 z-[1] h-[38%] pointer-events-none [background:linear-gradient(180deg,rgba(4,16,28,0.7)_0%,rgba(4,16,28,0.3)_64%,transparent_100%)]"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 z-[1] h-[30%] pointer-events-none [background:linear-gradient(0deg,rgba(4,16,28,0.62)_0%,rgba(4,16,28,0.24)_58%,transparent_100%)]"
        aria-hidden
      />

      <div
        className="absolute top-[1.6cqw] left-1/2 z-[3] h-[1.5cqw] w-[9cqw] -translate-x-1/2 rounded-full bg-black/45 shadow-[inset_0_1px_2px_rgba(0,0,0,0.55)]"
        aria-hidden
      />

      <UmetSeal className="absolute top-[2.8cqw] right-[3.4cqw] z-[3] w-[12cqw]" />

      <StatusStamp status={certificate.status} />

      <div className={FACE_INNER}>
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

        <div className="relative z-[2] flex min-h-0 items-start gap-[3.2cqw] pt-[5.5cqw]">
          <CardPhoto avatarUrl={avatarUrl} tier={tier} />

          <dl className="m-0 flex min-w-0 flex-1 flex-col gap-[2.8cqw] text-left">
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

function CertificateCardBackV2({
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
        className="absolute inset-0 z-[1] pointer-events-none [background:linear-gradient(180deg,rgba(4,16,28,0.72)_0%,rgba(4,16,28,0.32)_34%,rgba(4,16,28,0.32)_66%,rgba(4,16,28,0.6)_100%)]"
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

/* ─────────────────────────── Shared pieces ─────────────────────────── */

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

function CardField({
  labelUz,
  labelEn,
  value,
  accent = false,
  compact = false,
  mutedClass,
}: {
  labelUz: string;
  labelEn: string;
  value: string;
  accent?: boolean;
  compact?: boolean;
  mutedClass?: string;
}) {
  return (
    <div className="min-w-0">
      <dt
        className={cn(
          'm-0 text-[1.75cqw] font-medium leading-tight',
          mutedClass ?? 'text-[var(--card-muted)]',
        )}
      >
        {labelUz} <span className="italic opacity-80">/ {labelEn}</span>
      </dt>
      <dd
        className={cn(
          'm-0 mt-[0.3cqw] font-bold leading-tight text-white break-words',
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

function CardPhoto({
  avatarUrl,
  tier,
  frame = 'v2',
}: {
  avatarUrl?: string | null;
  tier: PositionTier;
  frame?: 'v1' | 'v2';
}) {
  const frameClass =
    frame === 'v1'
      ? 'w-[22cqw] shrink-0 self-stretch min-h-0 aspect-[3/4] rounded-[1cqw] overflow-hidden border-[0.45cqw] border-sky-300/90 shadow-[0_0_10px_rgba(56,189,248,0.35),0_3px_10px_rgba(0,0,0,0.4)]'
      : 'w-[24cqw] shrink-0 self-start aspect-[4/5] rounded-[1cqw] overflow-hidden border-[0.5cqw] border-white/85 shadow-[0_3px_10px_rgba(0,0,0,0.4)]';

  const src = avatarUrl ? resolveAssetUrl(avatarUrl) : '';
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
        className={cn(frameClass, 'object-cover object-[center_top]')}
      />
    );
  }

  return (
    <div
      className={cn(
        frameClass,
        'flex items-end justify-center',
        '[background:radial-gradient(ellipse_90%_70%_at_50%_18%,rgba(255,255,255,0.16),transparent_70%),linear-gradient(165deg,rgba(255,255,255,0.12),rgba(0,0,0,0.28))]',
      )}
      aria-hidden
    >
      <PhotoSilhouette tier={tier} />
    </div>
  );
}

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
