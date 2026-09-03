/** Kartada ko'rsatiladigan tashkilotning qisqa rasmiy nomi. */
export const SHORT_ORG_TITLE = '"O‘ZBEKISTON MET" AJ';

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

const MET_SHORT_RE =
  /["«»“”]?\s*O[''‘’]?ZBEKISTON\s+MET\s*["«»“”]?\s*(?:AJ|AO|АЖ|АО)?\.?/giu;

/**
 * MET filiallari — 2-qatorda to‘liq filial nomi.
 * Tartib muhim: Toshkent shahar → Toshkentdan oldin.
 */
const BRANCH_LABELS: { label: string; patterns: RegExp[] }[] = [
  {
    label: 'Toshkent Shahar Magistral elektr tarmoqlari',
    patterns: [
      /toshkent\s+shahar/i,
      /тошкент\s+шах?ар/i,
      /ташкент\s+(?:город|г\.?)/i,
    ],
  },
  {
    label: "Qoraqalpog'iston Magistral elektr tarmoqlari",
    patterns: [
      /qoraqalpog[''‘’]?iston/i,
      /qaraqalpog[''‘’]?iston/i,
      /каракалпакстан/i,
      /қорақалпоғ?истон/i,
    ],
  },
  {
    label: 'Andijon Magistral elektr tarmoqlari',
    patterns: [/andijon/i, /андижан/i, /андижон/i],
  },
  {
    label: 'Buxoro Magistral elektr tarmoqlari',
    patterns: [/buxoro/i, /бухара/i, /бухоро/i],
  },
  {
    label: 'Jizzax Magistral elektr tarmoqlari',
    patterns: [/jizzax/i, /джизак/i, /жиззах/i],
  },
  {
    label: 'Qashqadaryo Magistral elektr tarmoqlari',
    patterns: [/qashqadaryo/i, /қашқадар[еёя]/i, /кашкадарь?[еёя]/i],
  },
  {
    label: 'Navoiy Magistral elektr tarmoqlari',
    patterns: [/navoiy/i, /навои/i],
  },
  {
    label: 'Namangan Magistral elektr tarmoqlari',
    patterns: [/namangan/i, /наманган/i],
  },
  {
    label: 'Samarqand Magistral elektr tarmoqlari',
    patterns: [/samarqand/i, /самарканд/i, /самарқанд/i],
  },
  {
    label: 'Sirdaryo Magistral elektr tarmoqlari',
    patterns: [/sirdaryo/i, /сырдарь?[еёя]/i, /сирдар[еёя]/i],
  },
  {
    label: 'Surxondaryo Magistral elektr tarmoqlari',
    patterns: [/surxondaryo/i, /сурхандарь?[еёя]/i, /сурхондар[еёя]/i],
  },
  {
    label: "Farg'ona Magistral elektr tarmoqlari",
    patterns: [/farg[''‘’]?ona/i, /фергана/i, /фарғона/i],
  },
  {
    label: 'Xorazm Magistral elektr tarmoqlari',
    patterns: [/xorazm/i, /хорезм/i, /хоразм/i],
  },
  {
    label: 'Toshkent Magistral elektr tarmoqlari',
    patterns: [/toshkent/i, /тошкент/i, /ташкент/i],
  },
];

function normalizeApostrophes(value: string) {
  return value.replace(/[`´ʻʼ‘’']/g, "'");
}

function isHeadOffice(name: string) {
  return (
    !name ||
    /markaziy\s+apparat/i.test(name) ||
    /центральн\w*\s+аппарат/i.test(name)
  );
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
 * V1 kartadagi 2-qator (filial):
 * - Markaziy apparat → bo‘sh (yozilmaydi)
 * - Filial → to‘liq nom, masalan: `Toshkent Shahar Magistral elektr tarmoqlari`
 * Main org (1-qator) alohida — MET AJ takrorlanmaydi.
 */
export function formatV1BranchLabel(name: string | null | undefined): string {
  const raw = normalizeApostrophes((name ?? '').trim());
  if (isHeadOffice(raw)) return '';

  for (const { label, patterns } of BRANCH_LABELS) {
    if (patterns.some((re) => re.test(raw))) return label;
  }

  // Noma’lum filial — holding/MET qismini olib tashlab, qolganini ko‘rsatamiz
  let fallback = raw
    .replace(FULL_ORG_RE, ' ')
    .replace(MET_SHORT_RE, ' ')
    .replace(/\s*,\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  fallback = cleanupCardOrgTitle(normalizeOrgForm(fallback));
  if (!fallback || isHeadOffice(fallback) || MET_SHORT_RE.test(fallback)) {
    return '';
  }

  return fallback;
}
