import { useEffect, useRef, useState } from 'react';

/** URL yoki server qidiruvini kechiktirish — input fokusi saqlanadi. */
export function useDebouncedSearch(
  externalValue: string | undefined,
  onCommit: (value: string) => void,
  delayMs = 400,
) {
  const [draft, setDraft] = useState(externalValue ?? '');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setDraft(externalValue ?? '');
  }, [externalValue]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const onChange = (value: string) => {
    setDraft(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onCommit(value), delayMs);
  };

  return { value: draft, onChange };
}
