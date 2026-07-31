export type PositionTier = 'director' | 'deputy' | 'head' | 'employee';

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[`ʻʼ']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Lavozim matnidan vizual daraja (guvohnoma urg'u ranglari). */
export function resolvePositionTier(post?: string | null): PositionTier {
  const p = normalize(post ?? '');
  if (!p) return 'employee';

  const isDeputy =
    /o'rinbosar|orinbosar|замест|зам\.|deputy|substitute|vice[- ]?director|vice president/.test(
      p,
    );

  const isDirector =
    /^(gen\.?|general)\s+direktor|bosh direktor|direktor|директор|director|генерал|predsedatel|predsedat|председ|chairman|rais\b/.test(
      p,
    ) || /\bdirektor\b|\bдиректор\b/.test(p);

  if (isDirector && !isDeputy) return 'director';
  if (isDeputy) return 'deputy';

  if (
    /boshlig|boshligi|nachalnik|nachal'nik|начальник|rahbar|menejer|manager|chief|head of|bo'lim bosh|отдел|glavn|glavny|главн|zaveduyush|завед|mudir\b|bosh muhandis|bosh injiner|главный инженер|глав инженер|buxgalter bosh|главбух|главный бухгалтер/.test(
      p,
    )
  ) {
    return 'head';
  }

  return 'employee';
}

export function isGoldTier(tier: PositionTier) {
  return tier === 'director' || tier === 'deputy';
}
