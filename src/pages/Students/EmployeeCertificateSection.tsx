import { useState } from 'react';
import { Award, Printer } from 'lucide-react';
import { Button, Tag } from '@/components/ui';
import NoData from '@/components/NoData';
import { useTranslation } from '@/hooks/useTranslation';
import type { StudentDetail } from '@/services/api';
import {
  CertificateCard,
  formatCertificateDate,
} from '@/components/certificate/CertificateCard';
import { CertificateCardPrint } from '@/components/certificate/CertificateCardPrint';
import { buildEnergoIdCertificate } from '@/components/certificate/buildEnergoIdCertificate';

const T = {
  title: { uz: 'Guvohnoma', en: 'Certificate', ru: 'Удостоверение' },
  print: { uz: 'Chop etish', en: 'Print', ru: 'Печать' },
  none: {
    uz: 'ENERGO ID maʼlumoti yoʻq',
    en: 'No ENERGO ID data',
    ru: 'Нет данных ENERGO ID',
  },
  issued: { uz: 'Berilgan', en: 'Issued', ru: 'Выдано' },
  validUntil: { uz: 'Amal muddati', en: 'Valid until', ru: 'Действует до' },
  hint: {
    uz: 'ENERGO ID kartasi — avtomatik. Kartani bosib orqa tomonini koʻring.',
    en: 'ENERGO ID card — automatic. Click to flip.',
    ru: 'Карта ENERGO ID — автоматически. Нажмите, чтобы перевернуть.',
  },
  source: {
    uz: 'Manba: ENERGO ID',
    en: 'Source: ENERGO ID',
    ru: 'Источник: ENERGO ID',
  },
} as const;

interface EmployeeCertificateSectionProps {
  student: StudentDetail;
}

export function EmployeeCertificateSection({
  student,
}: EmployeeCertificateSectionProps) {
  const { t } = useTranslation();
  const [printing, setPrinting] = useState(false);

  const certificate = buildEnergoIdCertificate(student);
  const hasIdentity = Boolean(
    student.firstName?.trim() || student.lastName?.trim(),
  );

  const handlePrint = () => {
    setPrinting(true);
    requestAnimationFrame(() => {
      window.print();
      setPrinting(false);
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <Award size={16} className="text-[var(--shell-rail)]" />
            {t(T.title)}
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">{t(T.source)}</p>
        </div>

        {hasIdentity ? (
          <Button
            icon={<Printer className="h-4 w-4" />}
            onClick={handlePrint}
          >
            {t(T.print)}
          </Button>
        ) : null}
      </div>

      {!hasIdentity ? (
        <NoData text={t(T.none)} />
      ) : (
        <div className="flex flex-wrap items-start gap-8">
          <CertificateCard
            certificate={certificate}
            avatarUrl={student.avatarUrl}
            size="lg"
          />

          <div className="min-w-[220px] flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                {certificate.certificateNumber}
              </span>
              <Tag color="green">
                {t({ uz: 'Amalda', en: 'Valid', ru: 'Действует' })}
              </Tag>
            </div>

            <dl className="space-y-1.5 text-sm">
              <InfoRow
                label={t(T.issued)}
                value={formatCertificateDate(certificate.issuedAt)}
              />
              <InfoRow
                label={t(T.validUntil)}
                value={formatCertificateDate(certificate.validUntil)}
              />
              {certificate.personnelNumber ? (
                <InfoRow
                  label={t({
                    uz: 'Tabel',
                    en: 'Personnel №',
                    ru: 'Табель',
                  })}
                  value={certificate.personnelNumber}
                />
              ) : null}
              {certificate.positionTitle ? (
                <InfoRow
                  label={t({
                    uz: 'Lavozim',
                    en: 'Position',
                    ru: 'Должность',
                  })}
                  value={certificate.positionTitle}
                />
              ) : null}
            </dl>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(T.hint)}
            </p>
          </div>
        </div>
      )}

      {printing && hasIdentity ? (
        <CertificateCardPrint
          certificate={certificate}
          avatarUrl={student.avatarUrl}
        />
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-32 shrink-0 text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="m-0 font-medium text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}
