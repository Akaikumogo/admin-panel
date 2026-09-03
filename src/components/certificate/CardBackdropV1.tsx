/**
 * Variant 1 fon — uzatish ustunlari + O'zbekiston xaritasi (rasm).
 * Parent [container-type:inline-size] bo'lishi kerak.
 */
export function CardBackdropV1() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
      <img
        src="/id-card-bg-v1.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        draggable={false}
      />

      {/* Matn o'qilishi uchun yumshoq vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 58% 52% at 50% 48%, rgba(4,18,32,0.28), transparent 72%),' +
            'linear-gradient(180deg, rgba(3,16,28,0.5) 0%, transparent 24%, transparent 76%, rgba(3,16,28,0.45) 100%)',
        }}
      />
    </div>
  );
}

export const V1_FACE_STYLE = {
  color: '#f2f7fb',
  background: '#0b2a3b',
} as const;
