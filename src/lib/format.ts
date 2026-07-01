/** Barcha sanalar O‘zbekiston vaqti (Asia/Tashkent) bo‘yicha ko‘rsatiladi. */

import { latinTextToCyrillic } from '@/utils/latinToCyrillic';

export const APP_TIME_ZONE = 'Asia/Tashkent';

const UZ_WEEKDAYS = [
  'Yakshanba',
  'Dushanba',
  'Seshanba',
  'Chorshanba',
  'Payshanba',
  'Juma',
  'Shanba',
] as const;

const UZ_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
] as const;

const EN_WEEKDAY_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function parseDate(value: string | Date | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const d =
    typeof value === 'number'
      ? new Date(value)
      : typeof value === 'string'
        ? new Date(value)
        : value;
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

type TashkentParts = {
  day: string;
  month: string;
  year: string;
  hours: string;
  minutes: string;
  seconds: string;
  weekdayIndex: number;
};

function getTashkentParts(d: Date): TashkentParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00';

  const weekdayShort = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    weekday: 'short',
  }).format(d);

  return {
    day: pick('day'),
    month: pick('month'),
    year: pick('year'),
    hours: pick('hour'),
    minutes: pick('minute'),
    seconds: pick('second'),
    weekdayIndex: EN_WEEKDAY_SHORT[weekdayShort] ?? 0,
  };
}

export const fmtDateTime = (value: string | Date | number | null | undefined) => {
  const d = parseDate(value);
  if (!d) return '—';
  const p = getTashkentParts(d);
  return `${p.day}.${p.month}.${p.year} ${p.hours}:${p.minutes}`;
};

export const fmtDate = (value: string | Date | number | null | undefined) => {
  const d = parseDate(value);
  if (!d) return '—';
  const p = getTashkentParts(d);
  return `${p.day}.${p.month}.${p.year}`;
};

export const fmtTime = (value: string | Date | number | null | undefined) => {
  const d = parseDate(value);
  if (!d) return '—';
  const p = getTashkentParts(d);
  return `${p.hours}:${p.minutes}`;
};

export const toDateTimeAttr = (value: string | Date | number | null | undefined) => {
  const d = parseDate(value);
  if (!d) return undefined;
  return d.toISOString();
};

export const fmtRelative = (
  value: string | Date | number | null | undefined,
): string | null => {
  const d = parseDate(value);
  if (!d) return null;

  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return 'hozirgina';

  const sec = Math.floor(diffMs / 1000);
  if (sec < 15) return 'hozirgina';
  if (sec < 60) return `${sec} sn oldin`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} d oldin`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} st oldin`;

  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}k oldin`;

  const week = Math.floor(day / 7);
  if (day < 30) return `${week} h oldin`;

  return null;
};

export function fmtHeaderDate(lang: 'uz' | 'uz-cyrl' | 'en' | 'ru') {
  const now = new Date();

  if (lang === 'en') {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIME_ZONE,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(now);
  }

  if (lang === 'ru') {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: APP_TIME_ZONE,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(now);
  }

  const p = getTashkentParts(now);
  const dayNum = Number(p.day);
  const monthName = UZ_MONTHS[Number(p.month) - 1] ?? p.month;
  const weekday = UZ_WEEKDAYS[p.weekdayIndex];
  const uz = `${weekday}, ${dayNum} ${monthName}, ${p.year}`;

  return lang === 'uz-cyrl' ? latinTextToCyrillic(uz) : uz;
}
