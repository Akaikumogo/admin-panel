/** Familiya + ism + otasining ismi (bo‘sh qismlar tashlanadi). */
export type PersonNameParts = {
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
};

export function formatPersonName(
  person: PersonNameParts | null | undefined,
): string {
  if (!person) return '';
  return [person.lastName, person.firstName, person.middleName]
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

/** Ism ko‘rinishi: Familiya I.O. yoki Familiya I. */
export function formatPersonNameShort(
  person: PersonNameParts | null | undefined,
): string {
  if (!person) return '';
  const last = (person.lastName ?? '').trim();
  const first = (person.firstName ?? '').trim();
  const middle = (person.middleName ?? '').trim();
  const initials = [first, middle]
    .filter(Boolean)
    .map((p) => `${p[0]?.toLocaleUpperCase()}.`)
    .join('');
  return [last, initials].filter(Boolean).join(' ').trim();
}
