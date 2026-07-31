interface UmetLogoProps {
  /** Piksel o'lchami yoki CSS qiymati ("100%" — konteynerga moslashadi). */
  size?: number | string;
  variant?: 'light' | 'dark' | 'gold';
}

interface Palette {
  starFill: string;
  starStroke: string;
  innerFill: string;
  tower: string;
  green: string;
  blue: string;
  red: string;
}

const PALETTES: Record<NonNullable<UmetLogoProps['variant']>, Palette> = {
  light: {
    starFill: '#ffffff',
    starStroke: '#cbd5e1',
    innerFill: '#ffffff',
    tower: '#1e3a5f',
    green: '#16a34a',
    blue: '#2563eb',
    red: '#dc2626',
  },
  dark: {
    starFill: '#ffffff',
    starStroke: '#94a3b8',
    innerFill: '#ffffff',
    tower: '#1e3a5f',
    green: '#16a34a',
    blue: '#2563eb',
    red: '#dc2626',
  },
  gold: {
    starFill: '#f7ecc7',
    starStroke: '#d4af37',
    innerFill: '#fbf4d9',
    tower: '#9a7b1f',
    green: '#b8941f',
    blue: '#c8a83a',
    red: '#a8801a',
  },
};

/** 8 qirrali yulduz (o'zbek rozetkasi) nuqtalari. */
function starPoints(cx: number, cy: number, outer: number, inner: number) {
  const pts: string[] = [];
  for (let i = 0; i < 16; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 8) * i - Math.PI / 2;
    pts.push(
      `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`,
    );
  }
  return pts.join(' ');
}

/**
 * «O‘zbekiston milliy elektr tarmoqlari» emblemasi:
 * 8 qirrali yulduz ramka + ichida elektr uzatish ustuni va quvvat yoylari.
 */
export function UmetLogo({ size = 36, variant = 'dark' }: UmetLogoProps) {
  const p = PALETTES[variant];

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      {/* Tashqi 8 qirrali yulduz ramka */}
      <polygon
        points={starPoints(32, 32, 31, 22)}
        fill={p.starFill}
        stroke={p.starStroke}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {/* Ichki sakkizburchak maydon */}
      <polygon
        points={starPoints(32, 32, 21, 19.2)}
        fill={p.innerFill}
        stroke={p.green}
        strokeWidth={1.2}
        strokeLinejoin="round"
        opacity={0.9}
      />

      {/* Quvvat liniyalari — pastdagi rangli yoylar */}
      <g fill="none" strokeLinecap="round">
        <path d="M16 40 Q32 30 48 40" stroke={p.blue} strokeWidth={2} />
        <path d="M16 43.5 Q32 33.5 48 43.5" stroke={p.green} strokeWidth={2} />
        <path
          d="M18 47 Q32 38 46 47"
          stroke={p.red}
          strokeWidth={1.6}
          opacity={0.85}
        />
      </g>

      {/* Elektr uzatish ustuni */}
      <g
        fill="none"
        stroke={p.tower}
        strokeWidth={1.7}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M25 41 L29.2 19" />
        <path d="M39 41 L34.8 19" />
        <path d="M29.2 19 L32 13 L34.8 19" />
        <path d="M23.5 41 L40.5 41" />
        <path d="M26 22 L38 22" />
        <path d="M27 27 L37 27" />
        <path d="M28 32 L36 32" />
        <path
          d="M29.2 19 L34.8 27 M34.8 19 L29.2 27"
          strokeWidth={1.1}
          opacity={0.8}
        />
        <path
          d="M28.4 27 L35.6 36 M35.6 27 L28.4 36"
          strokeWidth={1.1}
          opacity={0.8}
        />
      </g>
    </svg>
  );
}
