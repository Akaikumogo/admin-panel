/** Kartada ko'rsatiladigan tashkilotning qisqa rasmiy nomi. */
export const SHORT_ORG_TITLE = '"O‘ZBEKISTON MET" AJ';

/** Filial yo‘q / markaziy apparat. */
export const HEAD_OFFICE_LABEL = 'Markaziy Apparat';

/** Tashkiliy-huquqiy shakl — nomdan oldin ham, keyin ham kelishi mumkin. */
const ORG_FORM = String.raw`(?:AJ|AO|АЖ|АО)\.?`;

/** To'liq nomning lotin, kirill va ruscha ko'rinishlari. */
const FULL_ORG_NAME = [
  String.raw`O\S?ZBEKISTON\s+MILLIY\s+ELEKTR\s+TARMOQLARI`,
  String.raw`ЎЗБЕКИСТОН\s+МИЛЛИЙ\s+ЭЛЕКТР\s+ТАРМО[КҚ]ЛАРИ`,
  String.raw`НАЦИОНАЛЬНЫЕ\s+ЭЛЕКТРИЧЕСКИЕ\s+СЕТИ\s+УЗБЕКИСТАНА`,
].join('|');

const FULL_ORG_RE = new RegExp(
  String.raw`(?:${ORG_FORM}\s*)?["«“'‘]?\s*(?:${FULL_ORG_NAME})\s*["»”'’]?(?:\s*${ORG_FORM})?`,
  'giu',
);

/** Sarlavha boshidagi bir yoki bir nechta AJ/AO. */
const LEADING_ORG_FORMS_RE = new RegExp(String.raw`^(?:${ORG_FORM}\s+)+`, 'iu');

const STRAY_QUOTE_BEFORE_FILIALI_RE =
  /\s+["«»“”]+\s*(?=(?:FILIALI|филиали)\b)/giu;
const STRAY_QUOTE_AFTER_FILIALI_RE =
  /(\b(?:FILIALI|филиали))\s*["«»“”]+/giu;

const TRAILING_QUOTES_RE = /\s*["«»“”'‘’]+\s*$/gu;

const MET_SHORT_RE = /["«»“”]?\s*O[''‘’]?ZBEKISTON\s+MET\s*["«»“”]?\s*(?:AJ|AO|АЖ|АО)?\.?/giu;

/** "Magistral elektr tarmoqlari" — MET bilan takror, olib tashlanadi. */
const MAGISTRAL_NOISE_RE =
  /magistral\s+elektr\s+tarmoqlari|магистрал\s+(?:электр\s+)?тармо[кқ]лари|магистральн\w*\s+электр\w*\s+сет\w*/giu;

/**
 * MET filiallari — kartada faqat qisqa nom (main org qatorida to‘liq nom bor).
 * Tartib muhim: Toshkent shahar → Toshkentdan oldin.
 */
const BRANCH_LABELS: { label: string; patterns: RegExp[] }[] = [
  {
    label: 'Toshkent shahar filiali',
    patterns: [
      /toshkent\s+shahar/i,
      /тошкент\s+шах?ар/i,
      /ташкент\s+(?:город|г\.?)/i,
    ],
  },
  {
    label: "Qoraqalpog'iston filiali",
    patterns: [
      /qoraqalpog[''‘’]?iston/i,
      /qaraqalpog[''‘’]?iston/i,
      /каракалпакстан/i,
      /қорақалпоғ?истон/i,
    ],
  },
  { label: 'Andijon filiali', patterns: [/andijon/i, /андижан/i, /андижон/i] },
  { label: 'Buxoro filiali', patterns: [/buxoro/i, /бухара/i, /бухоро/i] },
  { label: 'Jizzax filiali', patterns: [/jizzax/i, /джизак/i, /жиззах/i] },
  {
    label: 'Qashqadaryo filiali',
    patterns: [/qashqadaryo/i, /қашқадар[еёя]/i, /кашкадарь?[еёя]/i],
  },
  { label: 'Navoiy filiali', patterns: [/navoiy/i, /навои/i] },
  { label: 'Namangan filiali', patterns: [/namangan/i, /наманган/i] },
  {
    label: 'Samarqand filiali',
    patterns: [/samarqand/i, /самарканд/i, /самарқанд/i],
  },
  {
    label: 'Sirdaryo filiali',
    patterns: [/sirdaryo/i, /сырдарь?[еёя]/i, /сирдар[еёя]/i],
  },
  {
    label: 'Surxondaryo filiali',
    patterns: [/surxondaryo/i, /сурхандарь?[еёя]/i, /сурхондар[еёя]/i],
  },
  {
    label: "Farg'ona filiali",
    patterns: [/farg[''‘’]?ona/i, /фергана/i, /фарғона/i],
  },
  { label: 'Xorazm filiali', patterns: [/xorazm/i, /хорезм/i, /хоразм/i] },
  {
    label: 'Toshkent filiali',
    patterns: [/toshkent/i, /тошкент/i, /ташкент/i],
  },
];

function normalizeApostrophes(value: string) {
  return value.replace(/[`´ʻʼ‘’']/g, "'");
}

/**
 * NES dan keladigan nomlarda tashkiliy-huquqiy shakl "AO"/"АО" ko'rinishida
 * bo'ladi. Guvohnomada u doim "AJ" bo'lishi kerak.
 */
export function normalizeOrgForm(name: string) {
  return name.replace(
    /(^|[\s(«"'])(AO|АО)(?=[\s.,)»"']|$)/gu,
    (_match, lead: string) => `${lead}AJ`,
  );
}

export function cleanupCardOrgTitle(title: string): string {
  let t = title.replace(/\s{2,}/g, ' ').trim();

  t = t.replace(LEADING_ORG_FORMS_RE, '');
  t = t.replace(STRAY_QUOTE_BEFORE_FILIALI_RE, ' ');
  t = t.replace(STRAY_QUOTE_AFTER_FILIALI_RE, '$1');
  t = t.replace(TRAILING_QUOTES_RE, '');

  return t.replace(/\s{2,}/g, ' ').trim();
}

/**
 * To‘liq org nomini qisqa MET shakliga almashtirish (kerak bo‘lsa).
 * Kartaning 1-qatori odatda alohida ORG_LINE — bu funksiya kamroq ishlatiladi.
 */
export function formatCardOrgTitle(name: string | null | undefined): string {
  const raw = (name ?? '').trim();
  if (!raw) return SHORT_ORG_TITLE;

  const shortened = raw
    .replace(FULL_ORG_RE, ` ${SHORT_ORG_TITLE} `)
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleanupCardOrgTitle(normalizeOrgForm(shortened)) || SHORT_ORG_TITLE;
}

/**
 * V1/V2 kartadagi filial qatori — faqat qisqa filial nomi.
 * Main org qatorida to‘liq nom bor, shuning uchun MET AJ qo‘yilmaydi.
 *
 * Masalan: `Andijon filiali`, `Toshkent shahar filiali`, `Markaziy Apparat`
 */
export function formatV1BranchLabel(name: string | null | undefined): string {
  const raw = normalizeApostrophes((name ?? '').trim());
  if (!raw) return HEAD_OFFICE_LABEL;
  if (/markaziy\s+apparat/i.test(raw) || /центральн\w*\s+аппарат/i.test(raw)) {
    return HEAD_OFFICE_LABEL;
  }

  for (const { label, patterns } of BRANCH_LABELS) {
    if (patterns.some((re) => re.test(raw))) return label;
  }

  // Noma’lum filial — ortiqcha org/MET/magistral qismlarini olib tashlash
  let fallback = raw
    .replace(FULL_ORG_RE, ' ')
    .replace(MET_SHORT_RE, ' ')
    .replace(MAGISTRAL_NOISE_RE, ' ')
    .replace(/\s*,\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  fallback = cleanupCardOrgTitle(normalizeOrgForm(fallback));
  if (!fallback || MET_SHORT_RE.test(fallback)) return HEAD_OFFICE_LABEL;

  // "filiali" yo‘q bo‘lsa — qo‘shamiz (agar allaqachon filial emas bo‘lsa)
  if (!/\bfiliali\b|\bфилиали\b/i.test(fallback)) {
    fallback = `${fallback} filiali`;
  }

  return fallback;
}
