import type { EmployeeCertificate } from './types';

const ORG_TITLE = '«O‘zbekiston milliy elektr tarmoqlari» AJ';
const HEAD_OFFICE_PREFIX = 'UZ';
const USER_PORTAL_ORIGIN =
  (import.meta.env.VITE_USER_PORTAL_URL as string | undefined)?.trim() ||
  'https://cabinetid.uzbekistonmet.uz';

/** MET filial belgilari (guvohnoma raqami prefiksi). */
const BRANCH_PREFIXES: { prefix: string; patterns: RegExp[] }[] = [
  {
    prefix: 'TSh',
    patterns: [
      /toshkent\s+shahar/i,
      /тошкент\s+шах?ар/i,
      /ташкент\s+(?:город|г\.?)/i,
    ],
  },
  {
    prefix: 'QQ',
    patterns: [
      /qoraqalpog[''‘’]?iston/i,
      /qaraqalpog[''‘’]?iston/i,
      /каракалпакстан/i,
      /қорақалпоғ?истон/i,
    ],
  },
  { prefix: 'AN', patterns: [/andijon/i, /андижан/i, /андижон/i] },
  { prefix: 'BX', patterns: [/buxoro/i, /бухара/i, /бухоро/i] },
  { prefix: 'JX', patterns: [/jizzax/i, /джизак/i, /жиззах/i] },
  {
    prefix: 'QSh',
    patterns: [/qashqadaryo/i, /қашқадар[еёя]/i, /кашкадарь?[еёя]/i],
  },
  { prefix: 'NV', patterns: [/navoiy/i, /навои/i] },
  { prefix: 'NM', patterns: [/namangan/i, /наманган/i] },
  { prefix: 'SM', patterns: [/samarqand/i, /самарканд/i, /самарқанд/i] },
  {
    prefix: 'SR',
    patterns: [/sirdaryo/i, /сырдарь?[еёя]/i, /сирдар[еёя]/i],
  },
  {
    prefix: 'SX',
    patterns: [/surxondaryo/i, /сурхандарь?[еёя]/i, /сурхондар[еёя]/i],
  },
  {
    prefix: 'FR',
    patterns: [/farg[''‘’]?ona/i, /фергана/i, /фарғона/i],
  },
  { prefix: 'XZ', patterns: [/xorazm/i, /хорезм/i, /хоразм/i] },
  {
    prefix: 'TV',
    patterns: [/toshkent/i, /тошкент/i, /ташкент/i],
  },
];

export type EnergoIdCardSource = {
  id: string;
  energoId?: string | null;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  personnelNumber?: string | null;
  post?: string | null;
  avatarUrl?: string | null;
  organizations?: { id: string; name: string }[];
  createdAt?: string;
};

function normalizeApostrophes(value: string) {
  return value.replace(/[`´ʻʼ‘’']/g, "'");
}

/** ENERGO ID bilan bir xil prefiks — MET filial jadvali (Andijon → AN). */
export function resolveEnergoCardPrefix(branchName?: string | null): string {
  const raw = normalizeApostrophes((branchName ?? '').trim());
  if (!raw) return HEAD_OFFICE_PREFIX;

  for (const { prefix, patterns } of BRANCH_PREFIXES) {
    if (patterns.some((re) => re.test(raw))) return prefix;
  }

  return HEAD_OFFICE_PREFIX;
}

function certDigits(source: EnergoIdCardSource) {
  const personnel = (source.personnelNumber ?? '').replace(/\D/g, '');
  if (personnel) return personnel.slice(-4).padStart(4, '0');

  const src = source.email || source.energoId || source.id || '';
  let hash = 0;
  for (let i = 0; i < src.length; i += 1) {
    hash = (hash * 31 + src.charCodeAt(i)) % 10000;
  }
  return String(hash).padStart(4, '0');
}

function publicCardUrl(energoUserId: string) {
  const base = USER_PORTAL_ORIGIN.replace(/\/+$/, '');
  return `${base}/public/${encodeURIComponent(energoUserId)}`;
}

function validUntilFrom(createdAt?: string) {
  const base = createdAt ? new Date(createdAt) : new Date();
  if (Number.isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setFullYear(fallback.getFullYear() + 2);
    return fallback.toISOString();
  }
  const until = new Date(base);
  until.setFullYear(until.getFullYear() + 2);
  return until.toISOString();
}

/**
 * ENERGO ID guvohnomasini generatsiyasiz — xodim/NES maʼlumotidan yigʻadi.
 * QR → cabinetid public sahifa.
 */
export function buildEnergoIdCertificate(
  source: EnergoIdCardSource,
): EmployeeCertificate {
  const branchName = source.organizations?.[0]?.name?.trim() || '';
  const lastName = source.lastName?.trim() || '';
  const firstName = source.firstName?.trim() || '';
  const middleName = source.middleName?.trim() || '';
  const fullName = [lastName, firstName, middleName].filter(Boolean).join(' ');
  const prefix = resolveEnergoCardPrefix(branchName);
  const certificateNumber = `${prefix}${certDigits(source)}`;
  const publicId = source.energoId?.trim() || source.id;

  return {
    id: `energo-card-${source.id}`,
    certificateNumber,
    userId: source.id,
    organizationId: source.organizations?.[0]?.id ?? '',
    organizationTitle: ORG_TITLE,
    branchName,
    fullName,
    lastName,
    firstName,
    middleName,
    positionTitle: source.post?.trim() || '',
    personnelNumber: source.personnelNumber ?? null,
    examAttemptId: null,
    issuedAt: source.createdAt ?? new Date().toISOString(),
    validUntil: validUntilFrom(source.createdAt),
    revokedAt: null,
    revokeReason: null,
    status: 'VALID',
    verifyUrl: publicCardUrl(publicId),
    avatarUrl: source.avatarUrl ?? null,
  };
}
