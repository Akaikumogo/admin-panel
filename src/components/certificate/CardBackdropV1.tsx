import { useId } from 'react';

/**
 * Variant 1 fon: to'q teal, ustunlar, chaqmoq, O'zbekiston konturi, grid.
 * Container-relative — parent [container-type:inline-size] bo'lishi kerak.
 */
export function CardBackdropV1() {
  const uid = useId().replace(/:/g, '');
  const gridId = `v1-grid-${uid}`;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 40%, rgba(20,70,90,0.45), transparent 65%),' +
            'linear-gradient(135deg, #062636 0%, #0b2a3b 38%, #0a2438 68%, #061a28 100%)',
        }}
      />

      {/* Grid mesh */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.12]" preserveAspectRatio="none">
        <defs>
          <pattern id={gridId} width="18" height="18" patternUnits="userSpaceOnUse">
            <path d="M 18 0 L 0 0 0 18" fill="none" stroke="#7dd3fc" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${gridId})`} />
      </svg>

      {/* Uzbekistan outline (simplified, centered) */}
      <svg
        className="absolute left-1/2 top-[42%] h-[78%] w-[62%] -translate-x-1/2 -translate-y-1/2 opacity-[0.14]"
        viewBox="0 0 200 140"
        fill="none"
      >
        <path
          d="M28 72 C34 48 52 28 78 22 C102 16 128 18 148 28 C168 38 182 52 186 68 C190 88 178 108 156 118 C132 130 102 132 78 126 C52 120 32 104 26 86 C24 80 26 76 28 72 Z"
          stroke="#94e2ff"
          strokeWidth="1.4"
          fill="rgba(100,180,220,0.06)"
        />
        <path
          d="M148 28 C158 22 172 24 178 34 C184 46 180 58 172 62"
          stroke="#94e2ff"
          strokeWidth="1.2"
          fill="none"
        />
      </svg>

      {/* Left tower + arcs */}
      <svg
        className="absolute left-[-2%] top-[8%] h-[90%] w-[28%] opacity-[0.55]"
        viewBox="0 0 80 160"
        fill="none"
      >
        <path
          d="M40 8 L52 28 L48 28 L56 48 L50 48 L58 72 L48 72 L54 98 L44 98 L48 128 L32 128 L36 98 L26 98 L32 72 L22 72 L30 48 L24 48 L32 28 L28 28 Z"
          fill="rgba(148,200,220,0.22)"
          stroke="rgba(125,211,252,0.45)"
          strokeWidth="1"
        />
        <line x1="22" y1="72" x2="58" y2="72" stroke="rgba(125,211,252,0.35)" strokeWidth="1" />
        <line x1="26" y1="98" x2="54" y2="98" stroke="rgba(125,211,252,0.35)" strokeWidth="1" />
        <path
          d="M52 36 C68 48 74 70 70 92"
          stroke="#5eead4"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M56 52 C72 64 76 84 72 108"
          stroke="#67e8f9"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M48 24 C62 30 70 42 72 56"
          stroke="#a5f3fc"
          strokeWidth="0.9"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>

      {/* Right tower + arcs */}
      <svg
        className="absolute right-[-2%] top-[8%] h-[90%] w-[28%] opacity-[0.55]"
        viewBox="0 0 80 160"
        fill="none"
      >
        <path
          d="M40 8 L52 28 L48 28 L56 48 L50 48 L58 72 L48 72 L54 98 L44 98 L48 128 L32 128 L36 98 L26 98 L32 72 L22 72 L30 48 L24 48 L32 28 L28 28 Z"
          fill="rgba(148,200,220,0.22)"
          stroke="rgba(125,211,252,0.45)"
          strokeWidth="1"
        />
        <line x1="22" y1="72" x2="58" y2="72" stroke="rgba(125,211,252,0.35)" strokeWidth="1" />
        <line x1="26" y1="98" x2="54" y2="98" stroke="rgba(125,211,252,0.35)" strokeWidth="1" />
        <path
          d="M28 36 C12 48 6 70 10 92"
          stroke="#5eead4"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M24 52 C8 64 4 84 8 108"
          stroke="#67e8f9"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M32 24 C18 30 10 42 8 56"
          stroke="#a5f3fc"
          strokeWidth="0.9"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>

      {/* Soft vignette for text readability */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 50% at 50% 48%, rgba(6,26,40,0.35), transparent 70%),' +
            'linear-gradient(180deg, rgba(4,20,32,0.55) 0%, transparent 28%, transparent 72%, rgba(4,20,32,0.5) 100%)',
        }}
      />
    </div>
  );
}

export const V1_FACE_STYLE = {
  color: '#f2f7fb',
  background: '#0b2a3b',
} as const;
