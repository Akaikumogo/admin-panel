import type { DefaultOptionType } from 'antd/es/select';
import { cyrillicToLatinText } from '@/utils/cyrillicToLatin';

export function normalizeSelectSearch(value: string): string {
  return cyrillicToLatinText(value.trim().toLowerCase());
}

/** Select ichida kirill/lotin qidiruv */
export function filterSelectOption(
  input: string,
  option?: DefaultOptionType,
): boolean {
  const label = String(option?.label ?? '');
  const haystack = normalizeSelectSearch(label);
  const needle = normalizeSelectSearch(input);
  if (!needle) return true;
  return haystack.includes(needle);
}
