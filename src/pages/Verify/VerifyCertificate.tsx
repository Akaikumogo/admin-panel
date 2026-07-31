import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BadgeCheck, Ban, Clock, SearchX } from 'lucide-react';
import { Spin } from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import apiService from '@/services/api';
import type { CertificateVerification } from '@/services/api';
import { formatCertificateDate } from '@/components/certificate/CertificateCard';
import { UmetLogo } from '@/components/certificate/UmetLogo';

const T = {
  heading: {
    uz: 'Guvohnoma haqiqiyligini tekshirish',
    en: 'Certificate verification',
    ru: 'Проверка удостоверения',
  },
  valid: {
    uz: 'Guvohnoma haqiqiy',
    en: 'Certificate is valid',
    ru: 'Удостоверение действительно',
  },
  expired: {
    uz: 'Guvohnoma muddati o‘tgan',
    en: 'Certificate has expired',
    ru: 'Срок действия истёк',
  },
  revoked: {
    uz: 'Guvohnoma bekor qilingan',
    en: 'Certificate has been revoked',
    ru: 'Удостоверение аннулировано',
  },
  notFound: {
    uz: 'Bunday raqamli guvohnoma topilmadi',
    en: 'No certificate found with this number',
    ru: 'Удостоверение с таким номером не найдено',
  },
  failed: {
    uz: 'Tekshirib bo‘lmadi. Keyinroq urinib ko‘ring.',
    en: 'Verification failed. Please try again later.',
    ru: 'Не удалось проверить. Попробуйте позже.',
  },
  number: { uz: 'Guvohnoma raqami', en: 'Certificate number', ru: 'Номер' },
  fullName: { uz: 'F.I.Sh', en: 'Full name', ru: 'Ф.И.О' },
  position: { uz: 'Lavozimi', en: 'Position', ru: 'Должность' },
  branch: { uz: 'Filial', en: 'Branch', ru: 'Филиал' },
  issued: { uz: 'Berilgan sana', en: 'Issued', ru: 'Дата выдачи' },
  validUntil: { uz: 'Amal muddati', en: 'Valid until', ru: 'Действует до' },
} as const;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'done'; data: CertificateVerification };

const VerifyCertificatePage = () => {
  const { number } = useParams<{ number: string }>();
  const { t } = useTranslation();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    if (!number) return;
    let cancelled = false;

    setState({ kind: 'loading' });
    apiService
      .verifyCertificate(number)
      .then((data) => {
        if (!cancelled) setState({ kind: 'done', data });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [number]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <UmetLogo size={56} variant="dark" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            {t(T.heading)}
          </h1>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {state.kind === 'loading' && (
            <div className="flex h-40 items-center justify-center">
              <Spin size="large" />
            </div>
          )}

          {state.kind === 'error' && (
            <StatusBanner
              tone="neutral"
              icon={<SearchX size={22} />}
              title={t(T.failed)}
            />
          )}

          {state.kind === 'done' && !state.data.found && (
            <StatusBanner
              tone="neutral"
              icon={<SearchX size={22} />}
              title={t(T.notFound)}
              subtitle={number}
            />
          )}

          {state.kind === 'done' && state.data.found && (
            <>
              {state.data.status === 'VALID' && (
                <StatusBanner
                  tone="success"
                  icon={<BadgeCheck size={22} />}
                  title={t(T.valid)}
                />
              )}
              {state.data.status === 'EXPIRED' && (
                <StatusBanner
                  tone="warning"
                  icon={<Clock size={22} />}
                  title={t(T.expired)}
                />
              )}
              {state.data.status === 'REVOKED' && (
                <StatusBanner
                  tone="danger"
                  icon={<Ban size={22} />}
                  title={t(T.revoked)}
                />
              )}

              <dl className="mt-6 space-y-3">
                <Row label={t(T.number)} value={state.data.certificateNumber} mono />
                <Row label={t(T.fullName)} value={state.data.fullName} />
                <Row label={t(T.position)} value={state.data.positionTitle} />
                <Row label={t(T.branch)} value={state.data.branchName} />
                <Row
                  label={t(T.issued)}
                  value={formatCertificateDate(state.data.issuedAt)}
                />
                <Row
                  label={t(T.validUntil)}
                  value={formatCertificateDate(state.data.validUntil)}
                />
              </dl>

              <p className="mt-6 text-center text-xs text-slate-400">
                {state.data.organizationTitle}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const TONES = {
  success:
    'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  warning:
    'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  danger: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  neutral:
    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
} as const;

function StatusBanner({
  tone,
  icon,
  title,
  subtitle,
}: {
  tone: keyof typeof TONES;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 ${TONES[tone]}`}
    >
      {icon}
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {subtitle && (
          <p className="mt-0.5 font-mono text-xs opacity-80">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-32 shrink-0 text-xs text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd
        className={`m-0 min-w-0 break-words text-sm font-semibold text-slate-900 dark:text-white ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

export default VerifyCertificatePage;
