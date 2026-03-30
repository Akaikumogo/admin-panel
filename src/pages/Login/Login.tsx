import { useState } from 'react';
import { motion } from 'motion/react';
import { Form, Input, Button, Select, message } from 'antd';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import apiService from '@/services/api';

const LoginPage = () => {
  const { t, lang, setLang } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      await apiService.login(values.email, values.password);
      message.success(
        t({
          en: 'Login successful',
          uz: 'Muvaffaqiyatli kirildi',
          ru: 'Успешный вход'
        })
      );
      navigate('/dashboard/home');
    } catch (error: any) {
      message.error(
        error.response?.data?.message ||
          t({
            en: 'Login failed',
            uz: 'Kirish muvaffaqiyatsiz',
            ru: 'Ошибка входа'
          })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* BG Layer with animated gradient */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-[#2563EB] to-[#0a36ad] dark:from-[#020617] dark:to-[#0F172A] transition-colors duration-1000"
        initial={{ scale: 1.1, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.1, opacity: 0 }}
      />

      {/* Top-right controls */}
      <motion.div
        className="absolute top-4 right-4 z-20 flex items-center gap-2"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <Select
          value={lang}
          size="middle"
          variant="filled"
          onChange={(value) => setLang(value as typeof lang)}
          className="min-w-[120px] [&_.ant-select-selector]:!bg-white/15 [&_.ant-select-selector]:!border-white/20 [&_.ant-select-selection-item]:!text-white"
          popupClassName="backdrop-blur-sm"
          options={[
            { value: 'en', label: 'English' },
            { value: 'ru', label: 'Русский' },
            { value: 'uz', label: "O'zbekcha" },
            { value: 'uz-cyrl', label: 'Узбекча' },
          ]}
        />
        <ThemeToggle />
      </motion.div>

      {/* Login Box */}
      <motion.div
        className="w-full max-w-sm relative z-10 bg-white/90 dark:bg-[#0F172A]/90 border border-[#E2E8F0] dark:border-[#1E293B] backdrop-blur-md rounded-2xl shadow-xl p-8"
        initial={{ scale: 0.95, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      >
        <motion.h1
          className="text-3xl font-semibold mb-6 text-[#2563EB] dark:text-[#60A5FA] text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {t({
            en: 'Welcome back',
            uz: 'Xush kelibsiz',
            ru: 'Добро пожаловать'
          })}
        </motion.h1>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label={t({ en: 'Email', uz: 'Email', ru: 'Эл. почта' })}
            name="email"
            rules={[
              {
                required: true,
                message: t({
                  en: 'Please enter your email',
                  uz: 'Email kiriting',
                  ru: 'Введите эл. почту'
                })
              },
              {
                type: 'email',
                message: t({
                  en: 'Invalid email',
                  uz: 'Noto\'g\'ri email',
                  ru: 'Неверная эл. почта'
                })
              }
            ]}
          >
            <Input placeholder="example@mail.com" />
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
                  ru: 'Введите пароль'
                })
              }
            ]}
          >
            <Input.Password placeholder="********" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              className="font-medium"
              loading={loading}
            >
              {t({ en: 'Login', uz: 'Kirish', ru: 'Войти' })}
            </Button>
          </Form.Item>
        </Form>
      </motion.div>
    </motion.div>
  );
};

export default LoginPage;
