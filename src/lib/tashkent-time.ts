/** Asia/Tashkent (UTC+5) — admin panel default sana. */
const TZ_OFFSET_MS = 5 * 3600 * 1000;

export function tashkentToday(nowMs = Date.now()): string {
  return new Date(nowMs + TZ_OFFSET_MS).toISOString().slice(0, 10);
}
