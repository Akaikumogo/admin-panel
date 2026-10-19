import { motion } from 'motion/react';
import { Zap } from 'lucide-react';

const fade = {
  hidden: { opacity: 0.15, y: 14 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.04 + i * 0.05,
      type: 'spring' as const,
      stiffness: 140,
      damping: 22,
    },
  }),
};

type Props = {
  brand: string;
  brandSub: string;
  title: string;
  body: string;
  meta: string;
};

export function LoginCinema({ brand, brandSub, title, body, meta }: Props) {
  return (
    <aside className="relative hidden min-h-dvh overflow-hidden lg:block">
      <div className="cinema-stage absolute inset-0" aria-hidden />
      <div className="cinema-grain absolute inset-0 pointer-events-none" aria-hidden />
      <div className="cinema-vignette absolute inset-0 pointer-events-none" aria-hidden />

      <div className="relative z-10 flex h-full min-h-dvh flex-col justify-between p-10 xl:p-14">
        <motion.div
          custom={0}
          variants={fade}
          initial="hidden"
          animate="show"
          className="flex items-center gap-3"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--cinema-accent)] text-[var(--cinema-accent-fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <Zap className="h-5 w-5" fill="currentColor" strokeWidth={0} />
          </span>
          <div>
            <p className="text-[17px] font-semibold tracking-tight text-[var(--cinema-fg)]">
              {brand}
            </p>
            <p className="text-[12px] text-[var(--cinema-muted)]">{brandSub}</p>
          </div>
        </motion.div>

        <div className="max-w-[34rem]">
          <motion.h1
            custom={1}
            variants={fade}
            initial="hidden"
            animate="show"
            className="text-[clamp(2.4rem,4.2vw,3.6rem)] font-semibold leading-[1.05] tracking-tight text-[var(--cinema-fg)]"
          >
            {title}
          </motion.h1>
          <motion.p
            custom={2}
            variants={fade}
            initial="hidden"
            animate="show"
            className="mt-5 max-w-[42ch] text-[16px] leading-relaxed text-[var(--cinema-muted)]"
          >
            {body}
          </motion.p>
        </div>

        <motion.p
          custom={3}
          variants={fade}
          initial="hidden"
          animate="show"
          className="text-[13px] text-[var(--cinema-muted)]"
        >
          {meta}
        </motion.p>
      </div>

      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-[-4rem] h-[28rem] w-[28rem] rounded-full border border-[var(--cinema-accent)] opacity-[0.1]"
        animate={{ rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-4 bottom-8 h-[18rem] w-[18rem] rounded-full border border-[var(--cinema-accent)] opacity-[0.1]"
        animate={{ rotate: -360 }}
        transition={{ duration: 55, repeat: Infinity, ease: 'linear' }}
      />
    </aside>
  );
}
