export type DefaultOptionType = { value: string; label: React.ReactNode; disabled?: boolean };

export function filterSelectOption(input: string, option?: DefaultOptionType): boolean {
  if (!option) return false;
  const label = String(option.label ?? '').toLowerCase();
  return label.includes(input.toLowerCase());
}

import * as React from 'react';
