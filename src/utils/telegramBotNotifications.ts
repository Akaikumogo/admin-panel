const PREF_KEY = 'elektro_telegram_bot_web_notifications';
const LAST_UNREAD_KEY = 'elektro_telegram_bot_last_unread_total';
const LAST_NOTIFIED_AT_KEY = 'elektro_telegram_bot_last_notified_at';

export function isTelegramBotWebNotifEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === '1';
  } catch {
    return false;
  }
}

export function setTelegramBotWebNotifEnabled(on: boolean) {
  try {
    if (on) localStorage.setItem(PREF_KEY, '1');
    else localStorage.removeItem(PREF_KEY);
  } catch {
    /* ignore */
  }
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/** Brauzer ruxsati + Telegram bot toggle — ikkalasi ham kerak. */
export function canShowTelegramBotBrowserNotif(): boolean {
  if (!isTelegramBotWebNotifEnabled()) return false;
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  return Notification.permission === 'granted';
}

export async function enableTelegramBotWebNotifications(): Promise<{
  ok: boolean;
  permission: NotificationPermission | 'unsupported';
}> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { ok: false, permission: 'unsupported' };
  }
  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    setTelegramBotWebNotifEnabled(false);
    return { ok: false, permission };
  }
  setTelegramBotWebNotifEnabled(true);
  return { ok: true, permission };
}

export function disableTelegramBotWebNotifications() {
  setTelegramBotWebNotifEnabled(false);
}

export function readLastUnreadTotal(): number {
  try {
    const n = Number(localStorage.getItem(LAST_UNREAD_KEY) || '0');
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function writeLastUnreadTotal(n: number) {
  try {
    localStorage.setItem(LAST_UNREAD_KEY, String(n));
  } catch {
    /* ignore */
  }
}

export function showTelegramBotBrowserNotification(title: string, body: string) {
  if (!canShowTelegramBotBrowserNotif()) return;
  try {
    const now = Date.now();
    const last = Number(localStorage.getItem(LAST_NOTIFIED_AT_KEY) || '0');
    // Spamdan himoya: 4 soniyada 1 marta
    if (now - last < 4000) return;
    localStorage.setItem(LAST_NOTIFIED_AT_KEY, String(now));
    const n = new Notification(title, {
      body,
      tag: 'elektro-telegram-bot',
      renotify: true,
    });
    n.onclick = () => {
      window.focus();
      window.location.href = '/dashboard/telegram-bot';
      n.close();
    };
  } catch {
    /* ignore */
  }
}
