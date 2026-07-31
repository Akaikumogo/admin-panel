import { cn } from '@/lib/utils';
import type { PositionTier } from './position-tier';

interface CertificateRibbonsProps {
  tier: PositionTier;
}

/** Gorizontal (landscape) guvohnoma nisbati bo'yicha ishchi maydon. */
const VB_W = 320;
const VB_H = 200;

/** Tier bo'yicha lenta ranglari (tashqaridan ichkariga). */
function ribbonColors(tier: PositionTier): string[] {
  switch (tier) {
    case 'director':
    case 'deputy':
      return ['#6b4f10', '#a87f1c', '#f3e3a3', '#d4af37', '#caa233'];
    case 'head':
      return ['#0e2a52', '#1e56b0', '#eef4fb', '#0e7a57', '#16a06c'];
    case 'employee':
    default:
      return ['#0f2747', '#1a4f9e', '#e8f1fb', '#0f7a58', '#1f9c8a'];
  }
}

/**
 * Karta burchaklaridagi oqib turuvchi lentalar (yuqori-chap va pastki-o'ng).
 * Landscape nisbatiga moslangan: burchakni mahkam quchoqlaydi,
 * markazdagi matn va rasm maydonini ochiq qoldiradi.
 */
export function CertificateRibbons({ tier }: CertificateRibbonsProps) {
  const colors = ribbonColors(tier);
  const start = 34;
  const gap = 13;
  const heroIdx = 2;

  /** Chap qirradan kirib, yuqori qirradan chiqadigan silliq oqim. */
  const corner = (d: number) => {
    const vy = d * 0.98;
    const hx = d * 1.22;
    return `M -22 ${vy.toFixed(1)} C ${(hx * 0.2).toFixed(1)} ${(vy * 0.96).toFixed(1)}, ${(hx * 0.74).toFixed(1)} ${(vy * 0.2).toFixed(1)}, ${hx.toFixed(1)} -22`;
  };

  const strokes = (
    <>
      {colors.map((c, i) => (
        <path
          key={i}
          d={corner(start + i * gap)}
          stroke={c}
          strokeWidth={i === heroIdx ? 7.5 : 5.2}
        />
      ))}
      <path
        d={corner(start + heroIdx * gap - 2.2)}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.3}
      />
    </>
  );

  return (
    <svg
      className={cn(
        'absolute inset-0 w-full h-full pointer-events-none z-0',
        'drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.45)]',
      )}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <g fill="none" strokeLinecap="round">
        {strokes}
        {/* Pastki-o'ng burchak — aynan shu oqimning 180° aylantirilgani */}
        <g transform={`rotate(180 ${VB_W / 2} ${VB_H / 2})`}>{strokes}</g>
      </g>
    </svg>
  );
}
