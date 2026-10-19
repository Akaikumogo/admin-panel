import { useState } from 'react';
import { IdCard, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { Form, Input, Select, message } from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import apiService from '@/services/api';
import { LoginCinema } from './LoginCinema';
import { MagneticButton } from './MagneticButton';

const LoginPage = () => {
  const { t, lang, setLang } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      await apiService.login(values.email, values.password);
      message.success(
        t({
          en: 'Login successful',
          uz: 'Muvaffaqiyatli kirildi',
          ru: 'Успешный вход',
        }),
      );
      navigate('/dashboard/home');
    } catch (error: any) {
      message.error(
        error.response?.data?.message ||
          t({
            en: 'Login failed',
            uz: 'Kirish muvaffaqiyatsiz',
            ru: 'Ошибка входа',
          }),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEnergoIdLogin = async () => {
    try {
      setOauthLoading(true);
      await apiService.startEnergoIdLogin();
    } catch (error: any) {
      message.error(
        error.response?.data?.message ||
          t({
            en: 'Energo ID login failed',
            uz: 'Energo ID orqali kirish muvaffaqiyatsiz',
            ru: 'Ошибка входа через Energo ID',
          }),
      );
      setOauthLoading(false);
    }
  };

  const busy = loading || oauthLoading;

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1.15fr_0.85fr]">
      <LoginCinema
        brand="ElektroLearn"
        brandSub={t({
          en: 'Learning control panel',
          uz: 'O‘quv boshqaruv paneli',
          ru: 'Панель обучения',
        })}
        title={t({
          en: 'Train teams. Track progress.',
          uz: 'Jamoani o‘qing. Natijani kuzating.',
          ru: 'Обучайте. Отслеживайте прогресс.',
        })}
        body={t({
          en: 'Admin workspace for modules, employees, and live activity — calm zinc stage, teal signal.',
          uz: 'Modullar, xodimlar va jonli faollik — tinch zinc sahna, teal signal.',
          ru: 'Модули, сотрудники и активность — спокойная zinc-сцена, teal-сигнал.',
        })}
        meta={`© ${new Date().getFullYear()} ElektroLearn`}
      />

      <section className="relative flex min-h-dvh flex-col px-5 py-5 sm:px-8 lg:px-10 lg:py-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Select
            value={lang}
            size="middle"
            onChange={(value) => setLang(value as typeof lang)}
            className="min-w-[120px]"
            options={[
              { value: 'en', label: 'English' },
              { value: 'ru', label: 'Русский' },
              { value: 'uz', label: "O'zbekcha" },
              { value: 'uz-cyrl', label: 'Узбекча' },
            ]}
          />
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-6">
          <motion.div
            initial={{ opacity: 0.2, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 140, damping: 22 }}
          >
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                <Zap className="h-5 w-5" fill="currentColor" strokeWidth={0} />
              </span>
              <span className="font-semibold tracking-tight">ElektroLearn</span>
            </div>

            <h2 className="text-[1.75rem] font-semibold tracking-tight text-foreground">
              {t({
                en: 'Welcome back',
                uz: 'Xush kelibsiz',
                ru: 'Добро пожаловать',
              })}
            </h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
              {t({
                en: 'Sign in with Energo ID',
                uz: 'Energo ID orqali kiring',
                ru: 'Войдите через Energo ID',
              })}
            </p>
          </motion.div>

          <motion.div
            className="mt-6 space-y-3.5"
            initial={{ opacity: 0.2, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.04,
              type: 'spring',
              stiffness: 140,
              damping: 22,
            }}
          >
            <MagneticButton
              variant="primary"
              disabled={busy}
              onClick={() => void handleEnergoIdLogin()}
            >
              <IdCard size={20} aria-hidden />
              {oauthLoading
                ? t({
                    en: 'Redirecting…',
                    uz: 'Yo‘naltirilmoqda…',
                    ru: 'Перенаправление…',
                  })
                : t({
                    en: 'Login with Energo ID',
                    uz: 'Energo ID orqali kirish',
                    ru: 'Войти через Energo ID',
                  })}
            </MagneticButton>

            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[12px] text-muted-foreground">
                {t({
                  en: 'or local superadmin',
                  uz: 'yoki local superadmin',
                  ru: 'или локальный superadmin',
                })}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Form layout="vertical" onFinish={onFinish} className="space-y-1">
              <Form.Item
                label={t({ en: 'Email', uz: 'Email', ru: 'Эл. почта' })}
                name="email"
                rules={[
                  {
                    required: true,
                    message: t({
                      en: 'Please enter your email',
                      uz: 'Email kiriting',
                      ru: 'Введите эл. почту',
                    }),
                  },
                  {
                    type: 'email',
                    message: t({
                      en: 'Invalid email',
                      uz: "Noto'g'ri email",
                      ru: 'Неверная эл. почта',
                    }),
                  },
                ]}
              >
                <Input
                  placeholder="superadmin@example.com"
                  autoComplete="username"
                  disabled={busy}
                />
              </Form.Item>

              <Form.Item
                label={t({ en: 'Password', uz: 'Parol', ru: 'Пароль' })}
                name="password"
                rules={[
                  {
                    required: true,
                    message: t({
                      en: 'Please enter your password',
                      uz: 'Parol kiriting',
                      ru: 'Введите пароль',
                    }),
                  },
                ]}
              >
                <Input.Password
                  placeholder="********"
                  autoComplete="current-password"
                  disabled={busy}
                />
              </Form.Item>

              <Form.Item className="!mb-0">
                <MagneticButton type="submit" variant="ghost" disabled={busy}>
                  {loading
                    ? t({
                        en: 'Signing in…',
                        uz: 'Kirilmoqda…',
                        ru: 'Вход…',
                      })
                    : t({
                        en: 'Local login',
                        uz: 'Local kirish',
                        ru: 'Локальный вход',
                      })}
                </MagneticButton>
              </Form.Item>
            </Form>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
