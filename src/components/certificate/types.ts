export type CertificateStatus = 'VALID' | 'EXPIRED' | 'REVOKED';

/** Backend `/admin/certificates/...` va `/certificates/me` javobi. */
export interface EmployeeCertificate {
  id: string;
  certificateNumber: string;
  userId: string;
  organizationId: string;
  organizationTitle: string;
  branchName: string;
  fullName: string;
  lastName: string;
  firstName: string;
  middleName: string;
  positionTitle: string;
  personnelNumber: string | null;
  examAttemptId: string | null;
  issuedAt: string | null;
  validUntil: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  status: CertificateStatus;
  verifyUrl: string;
  avatarUrl: string | null;
}

/** `/admin/certificates/employees/:id/eligibility` javobi. */
export interface CertificateEligibility {
  eligible: boolean;
  reason: string | null;
  examAttemptId: string | null;
  finalizedAt: string | null;
}

/** `/public/certificates/verify/:number` javobi — minimal, ochiq ma'lumot. */
export type CertificateVerification =
  | { found: false }
  | {
      found: true;
      certificateNumber: string;
      fullName: string;
      positionTitle: string;
      branchName: string;
      organizationTitle: string;
      issuedAt: string | null;
      validUntil: string | null;
      status: CertificateStatus;
    };
