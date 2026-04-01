import { useEffect, useRef, useState } from 'react';
import { Card, Spin, Tag } from 'antd';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, QrCode, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';

const T = {
  title: { uz: 'QR Scan', en: 'QR Scan', ru: 'QR Скан' },
  scanning: { uz: 'Skan qilinyapti…', en: 'Scanning…', ru: 'Сканирование…' },
  result: { uz: 'Natija', en: 'Result', ru: 'Результат' },
  goUsers: {
    uz: 'Student profiliga o‘tyapmiz…',
    en: 'Opening student…',
    ru: 'Открываем студента…'
  }
} as const;

export default function QrScanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let stopped = false;
    let stopFn: (() => void) | null = null;

    const run = async () => {
      setStarting(true);
      setError(null);
      setResult(null);
      try {
        const reader = new BrowserMultiFormatReader();
        const videoEl = videoRef.current;
        if (!videoEl) throw new Error('Video element not ready');

        const controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: 'environment' } },
          videoEl,
          (res) => {
            if (stopped) return;
            if (res) {
              const text = res.getText()?.trim();
              if (!text) return;
              setResult(text);
              controls.stop();
              stopFn = () => controls.stop();
              // Student detail sahifasiga yo'naltiramiz
              navigate(`/dashboard/students/${encodeURIComponent(text)}`, {
                replace: true,
              });
            }
          },
        );

        stopFn = () => controls.stop();
      } catch (e) {
        if (!stopped) setError(String(e));
      } finally {
        if (!stopped) setStarting(false);
      }
    };

    void run();
    return () => {
      stopped = true;
      try {
        stopFn?.();
      } catch {
        /* ignore */
      }
    };
  }, [navigate]);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-100px)]">
      <Card
        className="!border-slate-200 dark:!border-slate-700/60"
        title={
          <span className="flex items-center gap-2">
            <QrCode size={16} />
            {t(T.title)}
          </span>
        }
      >
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <Camera size={16} />
          <span>{t(T.scanning)}</span>
          {starting ? <Spin size="small" /> : null}
        </div>
      </Card>

      <Card className="!border-slate-200 dark:!border-slate-700/60">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-black">
          <video
            ref={videoRef}
            className="h-[62vh] min-h-[420px] max-h-[680px] w-full object-cover"
          />

          {/* Overlay pattern */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-[70%] w-[70%] max-h-[420px] max-w-[420px]">
              {/* dim outside */}
              <div className="absolute inset-0 rounded-3xl ring-1 ring-white/10" />
              {/* corners */}
              <div className="absolute -left-1 -top-1 h-10 w-10 rounded-tl-3xl border-l-4 border-t-4 border-emerald-400/90" />
              <div className="absolute -right-1 -top-1 h-10 w-10 rounded-tr-3xl border-r-4 border-t-4 border-emerald-400/90" />
              <div className="absolute -left-1 -bottom-1 h-10 w-10 rounded-bl-3xl border-b-4 border-l-4 border-emerald-400/90" />
              <div className="absolute -right-1 -bottom-1 h-10 w-10 rounded-br-3xl border-b-4 border-r-4 border-emerald-400/90" />

              {/* scan line */}
              <div className="qr-scan-line absolute left-2 right-2 top-2 h-[2px] rounded-full bg-emerald-400/90 shadow-[0_0_24px_rgba(52,211,153,0.7)]" />
            </div>
          </div>
        </div>

        {result ? (
          <div className="mt-4 flex items-center gap-2">
            <Tag color="green">{t(T.result)}</Tag>
            <Tag icon={<Search size={12} />} color="blue">
              {t(T.goUsers)}
            </Tag>
            <span className="font-mono text-sm break-all">{result}</span>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 text-rose-600 dark:text-rose-400 text-sm">
            {error}
          </div>
        ) : null}
      </Card>

      <style>{`
        @keyframes qrScanMove {
          0% { transform: translateY(0); opacity: 0.55; }
          10% { opacity: 1; }
          50% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(calc(70% - 12px)); opacity: 0.55; }
        }
        .qr-scan-line {
          animation: qrScanMove 1.9s linear infinite;
        }
      `}</style>
    </div>
  );
}

