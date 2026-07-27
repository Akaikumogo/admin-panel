import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin } from '@/components/ui';
import apiService from '@/services/api';

const MOBILE_APP_URL = 'https://elektrolearn-mobile.uzbekistonmet.uz';
const REDIRECT_SECONDS = 5;

function resolveCallbackRedirectUri() {
  const stored = localStorage.getItem('oauth_redirect_uri')?.trim();
  if (stored) return stored;
  return `${window.location.origin}/oauth/callback`.replace(/\/+$/, '');
}

function resolveCallbackClient(redirectUri: string): 'mobile' | 'web' {
  const stored = localStorage.getItem('oauth_client');
  if (stored === 'web' || stored === 'mobile') return stored;
  return /^https?:\/\//i.test(redirectUri) ? 'web' : 'mobile';
}

function formatExchangeError(error: unknown) {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Kirish amalga oshmadi';
}

function isAdminAccessForbidden(error: unknown) {
  if (!isAxiosError(error) || error.response?.status !== 403) return false;
  const message = error.response?.data?.message;
  const text = Array.isArray(message)
    ? message.join(' ')
    : String(message ?? '');
  const lower = text.toLowerCase();
  return (
    lower.includes('moderator') ||
    lower.includes('superadmin') ||
    lower.includes('admin panel')
  );
}

function clearOAuthStorage() {
  localStorage.removeItem('oauth_state');
  localStorage.removeItem('oauth_redirect_uri');
  localStorage.removeItem('oauth_client');
  localStorage.removeItem('oauth_code_verifier');
}

const OAuthCallbackPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    const code = params.get('onetime') ?? params.get('code');
    if (!code) {
      setError('OAuth code topilmadi');
      return;
    }

    const redirectUri = resolveCallbackRedirectUri();
    const client = resolveCallbackClient(redirectUri);
    const state = params.get('state');
    const expectedState = localStorage.getItem('oauth_state');
    if (!state || !expectedState || expectedState !== state) {
      setError('OAuth state mos kelmadi');
      return;
    }

    const codeVerifier = localStorage.getItem('oauth_code_verifier') ?? undefined;

    void (async () => {
      try {
        await apiService.exchangeAdminEnergoIdCode(
          code,
          redirectUri,
          state,
          client,
          codeVerifier,
        );
        clearOAuthStorage();
        navigate('/dashboard/home', { replace: true });
      } catch (e) {
        clearOAuthStorage();
        if (isAdminAccessForbidden(e)) {
          setAccessDenied(true);
          return;
        }
        setError(formatExchangeError(e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!accessDenied) return;
    if (secondsLeft <= 0) {
      window.location.replace(MOBILE_APP_URL);
      return;
    }
    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [accessDenied, secondsLeft]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-100 dark:bg-slate-950 px-4">
      <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl dark:bg-slate-900">
        {accessDenied ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Siz ushbu platformaga kira olmaysiz
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {secondsLeft} soniyadan so‘ng mobil ilovaga yo‘naltirilasiz…
            </p>
            <a
              href={MOBILE_APP_URL}
              className="mt-2 text-sm font-medium text-blue-600 underline dark:text-blue-400"
            >
              Hozir o‘tish
            </a>
          </div>
        ) : error ? (
          <>
            <p className="mb-4 text-sm text-red-600 dark:text-red-300">{error}</p>
            <button
              type="button"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => navigate('/login', { replace: true })}
            >
              Qayta urinish
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Spin />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Energo ID orqali kirilmoqda…
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
