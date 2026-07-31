import { useState } from 'react';
import { Award, Ban, Printer, RefreshCw } from 'lucide-react';
import { Button, Modal, Popconfirm, Spin, Tag, Textarea, message } from '@/components/ui';
import NoData from '@/components/NoData';
import { useFetch } from '@/hooks/useFetch';
import { useTranslation } from '@/hooks/useTranslation';
import { can } from '@/utils/can';
import apiService from '@/services/api';
import type { CertificateEligibility, EmployeeCertificate } from '@/services/api';
import {
  CertificateCard,
  formatCertificateDate,
} from '@/components/certificate/CertificateCard';
import { CertificateCardPrint } from '@/components/certificate/CertificateCardPrint';

const T = {
  title: { uz: 'Guvohnoma', en: 'Certificate', ru: 'Удостоверение' },
  issue: { uz: 'Guvohnoma berish', en: 'Issue certificate', ru: 'Выдать удостоверение' },
  reissue: { uz: 'Yangi guvohnoma', en: 'New certificate', ru: 'Новое удостоверение' },
  print: { uz: 'Chop etish', en: 'Print', ru: 'Печать' },
  revoke: { uz: 'Bekor qilish', en: 'Revoke', ru: 'Аннулировать' },
  revokeConfirm: {
    uz: 'Guvohnoma bekor qilinsinmi? Bu amalni qaytarib bo‘lmaydi.',
    en: 'Revoke this certificate? This cannot be undone.',
    ru: 'Аннулировать удостоверение? Это необратимо.',
  },
  revokeReason: { uz: 'Bekor qilish sababi', en: 'Reason', ru: 'Причина' },
  none: {
    uz: 'Bu xodimga hali guvohnoma berilmagan',
    en: 'No certificate issued yet',
    ru: 'Удостоверение ещё не выдано',
  },
  issued: { uz: 'Berilgan', en: 'Issued', ru: 'Выдано' },
  validUntil: { uz: 'Amal muddati', en: 'Valid until', ru: 'Действует до' },
  hint: {
    uz: 'Kartani bosib orqa tomonini ko‘rish mumkin.',
    en: 'Click the card to flip it.',
    ru: 'Нажмите на карточку, чтобы перевернуть.',
  },
  history: { uz: 'Oldingi guvohnomalar', en: 'Previous certificates', ru: 'Предыдущие удостоверения' },
  issueFailed: { uz: 'Guvohnoma berilmadi', en: 'Could not issue', ru: 'Не удалось выдать' },
  issueOk: { uz: 'Guvohnoma berildi', en: 'Certificate issued', ru: 'Удостоверение выдано' },
  revokeOk: { uz: 'Guvohnoma bekor qilindi', en: 'Certificate revoked', ru: 'Удостоверение аннулировано' },
  cancel: { uz: 'Bekor qilish', en: 'Cancel', ru: 'Отмена' },
  confirm: { uz: 'Tasdiqlash', en: 'Confirm', ru: 'Подтвердить' },
} as const;

const STATUS_TONE = {
  VALID: { color: 'green', uz: 'Amalda', en: 'Valid', ru: 'Действует' },
  EXPIRED: { color: 'orange', uz: 'Muddati o‘tgan', en: 'Expired', ru: 'Истёк' },
  REVOKED: { color: 'red', uz: 'Bekor qilingan', en: 'Revoked', ru: 'Аннулировано' },
} as const;

interface EmployeeCertificateSectionProps {
  userId: string;
  avatarUrl: string | null;
}

export function EmployeeCertificateSection({
  userId,
  avatarUrl,
}: EmployeeCertificateSectionProps) {
  const { t } = useTranslation();
  const [issuing, setIssuing] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [printing, setPrinting] = useState(false);

  const {
    data: certificates,
    initialLoading,
    refetch,
  } = useFetch<EmployeeCertificate[]>(
    ['employee-certificates', userId],
    () => apiService.getEmployeeCertificates(userId),
    [],
  );

  const { data: eligibility, refetch: refetchEligibility } =
    useFetch<CertificateEligibility | null>(
      ['certificate-eligibility', userId],
      () => apiService.getCertificateEligibility(userId),
      null,
    );

  const current = certificates[0] ?? null;
  const previous = certificates.slice(1);
  const canIssue = can('students', 'create');
  const canRevoke = can('students', 'delete');

  const handleIssue = async () => {
    if (!canIssue) return;
    try {
      setIssuing(true);
      await apiService.issueCertificate(userId);
      message.success(t(T.issueOk));
      refetch();
      refetchEligibility();
    } catch {
      /* xatoni global interceptor ko'rsatadi */
    } finally {
      setIssuing(false);
    }
  };

  const handleRevoke = async () => {
    if (!current || !canRevoke) return;
    try {
      await apiService.revokeCertificate(current.id, revokeReason.trim());
      message.success(t(T.revokeOk));
      setRevokeOpen(false);
      setRevokeReason('');
      refetch();
      refetchEligibility();
    } catch {
      /* xatoni global interceptor ko'rsatadi */
    }
  };

  /**
   * Chop etish qatlami faqat bosilganda DOM ga qo'shiladi — shunda
   * dashboard sahifasida ortiqcha portal doim osilib turmaydi.
   */
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
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
          <Award size={16} className="text-[var(--shell-rail)]" />
          {t(T.title)}
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          {current && (
            <Button
              icon={<Printer className="h-4 w-4" />}
              onClick={handlePrint}
            >
              {t(T.print)}
            </Button>
          )}
          {current && current.status !== 'REVOKED' && canRevoke && (
            <Button
              danger
              icon={<Ban className="h-4 w-4" />}
              onClick={() => setRevokeOpen(true)}
            >
              {t(T.revoke)}
            </Button>
          )}
          {canIssue && (
            <Popconfirm
              title={
                eligibility?.eligible
                  ? t(T.issue)
                  : (eligibility?.reason ?? t(T.issueFailed))
              }
              onConfirm={handleIssue}
              disabled={!eligibility?.eligible}
            >
              <Button
                type="primary"
                icon={<RefreshCw className="h-4 w-4" />}
                loading={issuing}
                disabled={!eligibility?.eligible}
              >
                {current ? t(T.reissue) : t(T.issue)}
              </Button>
            </Popconfirm>
          )}
        </div>
      </div>

      {!eligibility?.eligible && eligibility?.reason && (
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          {eligibility.reason}
        </p>
      )}

      {initialLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Spin />
        </div>
      ) : !current ? (
        <NoData text={t(T.none)} />
      ) : (
        <div className="flex flex-wrap items-start gap-8">
          <CertificateCard
            certificate={current}
            avatarUrl={avatarUrl}
            size="lg"
          />

          <div className="min-w-[220px] flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                {current.certificateNumber}
              </span>
              <Tag color={STATUS_TONE[current.status].color}>
                {t(STATUS_TONE[current.status])}
              </Tag>
            </div>

            <dl className="space-y-1.5 text-sm">
              <InfoRow
                label={t(T.issued)}
                value={formatCertificateDate(current.issuedAt)}
              />
              <InfoRow
                label={t(T.validUntil)}
                value={formatCertificateDate(current.validUntil)}
              />
              {current.revokeReason && (
                <InfoRow label={t(T.revokeReason)} value={current.revokeReason} />
              )}
            </dl>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(T.hint)}
            </p>

            {previous.length > 0 && (
              <div className="pt-2">
                <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t(T.history)}
                </p>
                <ul className="space-y-1">
                  {previous.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
                    >
                      <span className="font-mono">{item.certificateNumber}</span>
                      <span className="text-slate-400">
                        {formatCertificateDate(item.issuedAt)}
                      </span>
                      <Tag color={STATUS_TONE[item.status].color}>
                        {t(STATUS_TONE[item.status])}
                      </Tag>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {printing && current && (
        <CertificateCardPrint certificate={current} avatarUrl={avatarUrl} />
      )}

      <Modal
        open={revokeOpen}
        onCancel={() => setRevokeOpen(false)}
        onOk={handleRevoke}
        okText={t(T.confirm)}
        cancelText={t(T.cancel)}
        title={t(T.revoke)}
      >
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          {t(T.revokeConfirm)}
        </p>
        <Textarea
          value={revokeReason}
          onChange={(e) => setRevokeReason(e.target.value)}
          placeholder={t(T.revokeReason)}
          rows={3}
        />
      </Modal>
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
