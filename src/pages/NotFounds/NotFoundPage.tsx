import { motion } from 'motion/react';

import { useTranslation } from '@/hooks/useTranslation';

import ParticlesBackground from '@/components/ParticlesBackground';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-4 text-center text-foreground transition-colors duration-300"
    >
      <ParticlesBackground />
      <motion.h1
        className="mb-2 text-6xl font-bold text-primary"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        404
      </motion.h1>

      <motion.h2
        className="mb-5 text-lg text-muted-foreground md:text-xl"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {t({
          uz: 'Sahifa topilmadi',
          ru: 'Страница не найдена',
          en: 'Page not found',
        })}
      </motion.h2>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          {t({
            uz: 'Bosh sahifaga qaytish',
            ru: 'Вернуться на главную',
            en: 'Go back home',
          })}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default NotFoundPage;
