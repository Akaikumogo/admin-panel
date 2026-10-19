import { useRef, type ReactNode } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from 'motion/react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  variant?: 'primary' | 'ghost';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
};

const SPRING = { type: 'spring' as const, stiffness: 220, damping: 18, mass: 0.6 };

export function MagneticButton({
  children,
  variant = 'primary',
  className,
  disabled,
  type = 'button',
  onClick,
}: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING);
  const springY = useSpring(y, SPRING);
  const transform = useMotionTemplate`translate3d(${springX}px, ${springY}px, 0)`;

  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    x.set(dx * 0.22);
    y.set(dy * 0.28);
  };

  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{ transform }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={cn(
        'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-medium transition-opacity will-change-transform disabled:opacity-55',
        variant === 'primary'
          ? 'bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-[var(--primary-hover)]'
          : 'border border-border bg-card text-foreground hover:border-primary',
        className,
      )}
    >
      {children}
    </motion.button>
  );
}
