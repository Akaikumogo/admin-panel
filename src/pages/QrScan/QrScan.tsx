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
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700/60 bg-black">
          <video ref={videoRef} className="h-80 w-full object-cover" />
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
    </div>
  );
}

