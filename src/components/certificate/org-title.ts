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

/**
 * Tashkilotning to'liq nomi kartaga sig'maydi: NES dan qanday yozilishi bilan
 * kelmasin — lotin, kirill, "AO"/"AJ" oldinda yoki ortida — qisqa shaklga
 * almashtiriladi. Filialning o'z nomi o'zgarishsiz qoladi.
 */
export function formatCardOrgTitle(name: string | null | undefined): string {
  const raw = (name ?? '').trim();
  if (!raw) return SHORT_ORG_TITLE;

  const shortened = raw
    .replace(FULL_ORG_RE, ` ${SHORT_ORG_TITLE} `)
    .replace(/\s{2,}/g, ' ')
    .trim();

  return normalizeOrgForm(shortened) || SHORT_ORG_TITLE;
}
