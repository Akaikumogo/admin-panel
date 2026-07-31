import type { CSSProperties } from 'react';
import type { PositionTier } from './position-tier';

type CardSide = 'front' | 'back';

/**
 * Barcha guvohnomalar uchun yagona fon — to'q navy + to'q yashil oqim.
 * Tier faqat urg'u (accent) ranglarini o'zgartiradi, dizayn bir xil qoladi.
 */
const BASE_BACKGROUND =
  'radial-gradient(ellipse 85% 65% at 8% 0%, rgba(13, 110, 76, 0.42), transparent 62%),' +
  'radial-gradient(ellipse 75% 70% at 100% 100%, rgba(12, 84, 66, 0.34), transparent 58%),' +
  'radial-gradient(ellipse 60% 50% at 50% 42%, rgba(56, 189, 248, 0.07), transparent 70%),' +
  'linear-gradient(118deg, #08302b 0%, #0b2138 34%, #0a1c30 62%, #061423 100%)';

const BASE_BACK_BACKGROUND =
  'radial-gradient(ellipse 80% 60% at 92% 4%, rgba(13, 110, 76, 0.34), transparent 60%),' +
  'radial-gradient(ellipse 70% 60% at 0% 100%, rgba(12, 84, 66, 0.28), transparent 58%),' +
  'linear-gradient(118deg, #071c2e 0%, #0a2138 42%, #08202c 74%, #061423 100%)';

const BASE_VARS = {
  '--card-text': '#f2f7fb',
  '--card-muted': 'rgba(224, 238, 248, 0.7)',
  '--card-qr': '#0b1220',
};

type TierAccents = Record<string, string>;

/** Tier bo'yicha urg'u ranglari (fon va joylashuv barcha tierda bir xil). */
const TIER_ACCENTS: Record<PositionTier, TierAccents> = {
  director: {
    '--card-accent': '#d4af37',
    '--card-accent-2': '#f5e6a8',
    '--card-number': '#ffd84d',
    '--card-qr-border': '#d4af37',
    '--card-role': '#f5e6a8',
  },
  deputy: {
    '--card-accent': '#d4af37',
    '--card-accent-2': '#ffe9a8',
    '--card-number': '#ffd84d',
    '--card-qr-border': '#d4af37',
    '--card-role': '#ffe9a8',
  },
  head: {
    '--card-accent': '#22c55e',
    '--card-accent-2': '#4ade80',
    '--card-number': '#ffd84d',
    '--card-qr-border': '#22c55e',
    '--card-role': '#7dd3a8',
  },
  employee: {
    '--card-accent': '#38bdf8',
    '--card-accent-2': '#4ade80',
    '--card-number': '#ffd84d',
    '--card-qr-border': '#38bdf8',
    '--card-role': '#bae6fd',
  },
};

export function tierFaceStyle(
  tier: PositionTier,
  side: CardSide,
): CSSProperties {
  const vars = { ...BASE_VARS, ...TIER_ACCENTS[tier] } as CSSProperties;

  return {
    ...vars,
    background: side === 'back' ? BASE_BACK_BACKGROUND : BASE_BACKGROUND,
    color: BASE_VARS['--card-text'],
    containerType: 'inline-size',
  } as CSSProperties;
}
