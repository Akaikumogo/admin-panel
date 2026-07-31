import { createPortal } from 'react-dom';
import { CertificateCardBack, CertificateCardFront } from './CertificateCard';
import type { EmployeeCertificate } from './types';

interface CertificateCardPrintProps {
  certificate: EmployeeCertificate;
  avatarUrl?: string | null;
}

/**
 * Faqat chop etish uchun joylashuv: bitta A4 list —
 * yuqorida old tomon, pastda orqa tomon (96 x 60 mm, gorizontal).
 * Dashboard qobig'i `overflow: hidden` bo'lgani uchun portal orqali
 * to'g'ridan-to'g'ri `body` ga chiqariladi.
 */
export function CertificateCardPrint({
  certificate,
  avatarUrl,
}: CertificateCardPrintProps) {
  return createPortal(
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { margin: 0; padding: 0; background: #fff; height: auto; overflow: visible; }
          body > #root { display: none !important; }
          .certificate-print-root,
          .certificate-print-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
      <div className="certificate-print-root hidden print:block" aria-hidden>
        <div className="print:flex print:h-[297mm] print:w-[210mm] print:flex-col print:items-center print:justify-center print:gap-[14mm] print:overflow-hidden">
          <div className="print:drop-shadow-[0_1mm_2mm_rgba(0,0,0,0.25)]">
            <CertificateCardFront
              certificate={certificate}
              avatarUrl={avatarUrl ?? certificate.avatarUrl}
              variant="print"
            />
          </div>
          <div className="print:drop-shadow-[0_1mm_2mm_rgba(0,0,0,0.25)]">
            <CertificateCardBack certificate={certificate} variant="print" />
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
