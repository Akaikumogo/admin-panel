/** Uzun filial nomidan qisqa ko‘rinish (Farg‘ona, Andijon, …) */
export function shortBranchName(fullName: string): string {
  const raw = (fullName || '').trim();
  if (!raw) return '—';

  const cityPatterns: Array<[RegExp, string]> = [
    [/FARG[ʻ''']?ONA/i, "Farg'ona"],
    [/ANDIJON/i, 'Andijon'],
    [/NAMANGAN/i, 'Namangan'],
    [/TOSHKENT/i, 'Toshkent'],
    [/SAMARQAND/i, 'Samarqand'],
    [/BUXORO/i, 'Buxoro'],
    [/XORAZM/i, 'Xorazm'],
    [/NAVOIY/i, 'Navoiy'],
    [/JIZZAX/i, 'Jizzax'],
    [/SIRDARYO/i, 'Sirdaryo'],
    [/QASHQADARYO/i, 'Qashqadaryo'],
    [/SURXONDARYO/i, 'Surxondaryo'],
    [/QORAQALPOG[ʻ''']?ISTON/i, "Qoraqalpog'iston"],
  ];

  for (const [re, label] of cityPatterns) {
    if (re.test(raw)) return label;
  }

  const cleaned = raw
    .replace(/^AJ\s+/i, '')
    .replace(
      /O['ʻ']?ZBEKISTON\s+(MILLIY\s+)?ELEKTR\s+TARMOQLARI(\s+AKSIYADORLIK\s+JAMIYATI)?\s*/i,
      '',
    )
    .replace(/\s*MAGISTRAL\s+ELEKTR\s+TARMOQLARI\s*/i, ' ')
    .replace(/\s*ELEKTR\s+TARMOQLARI\s*/i, ' ')
    .replace(/\s*FILIALI\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned && cleaned.length < raw.length && cleaned.length <= 24) {
    return cleaned;
  }

  if (raw.length <= 22) return raw;
  return `${raw.slice(0, 20)}…`;
}

export function formatDelta(percent: number | null | undefined): {
  text: string;
  up: boolean | null;
} {
  if (percent === null || percent === undefined || Number.isNaN(percent)) {
    return { text: '—', up: null };
  }
  const up = percent >= 0;
  const sign = up ? '+' : '';
  return { text: `${sign}${percent}%`, up };
}
