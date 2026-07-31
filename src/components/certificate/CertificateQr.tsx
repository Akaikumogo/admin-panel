import { useMemo } from 'react';
import QRCode from 'qrcode';

interface CertificateQrProps {
  /** QR ichiga kodlanadigan matn / URL. */
  value: string;
  /** Modul (nuqta) rangi. */
  color?: string;
}

/** Haqiqiy, skanerlanadigan QR kodni SVG ko'rinishida chizadi. */
export function CertificateQr({
  value,
  color = 'var(--card-qr, #0b1220)',
}: CertificateQrProps) {
  const { size, rects } = useMemo(() => {
    const payload = (value || ' ').trim() || ' ';
    try {
      const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
      const n = qr.modules.size;
      const cells: { x: number; y: number }[] = [];
      for (let y = 0; y < n; y += 1) {
        for (let x = 0; x < n; x += 1) {
          if (qr.modules.get(x, y)) cells.push({ x, y });
        }
      }
      return { size: n, rects: cells };
    } catch {
      return { size: 21, rects: [] as { x: number; y: number }[] };
    }
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full h-full block rounded-[3px]"
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR kod"
    >
      <rect x={0} y={0} width={size} height={size} fill="#ffffff" />
      {rects.map(({ x, y }) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={1.04}
          height={1.04}
          fill={color}
        />
      ))}
    </svg>
  );
}
