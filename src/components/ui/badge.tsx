import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/12 text-primary dark:bg-primary/20',
        secondary: 'border-transparent bg-muted text-muted-foreground',
        destructive: 'border-transparent bg-destructive/12 text-destructive dark:bg-destructive/20',
        outline: 'border-border text-foreground',
        success:
          'border-transparent bg-emerald-500/12 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300',
        warning:
          'border-transparent bg-amber-500/12 text-amber-900 dark:bg-amber-400/15 dark:text-amber-300',
        info: 'border-transparent bg-slate-500/10 text-slate-700 dark:bg-slate-400/15 dark:text-slate-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** Ant Design Tag color mapping */
const tagColorMap: Record<string, BadgeProps['variant']> = {
  success: 'success',
  processing: 'info',
  error: 'destructive',
  warning: 'warning',
  default: 'secondary',
  blue: 'info',
  green: 'success',
  gold: 'warning',
  purple: 'default',
};

export function Tag({
  color,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { color?: string }) {
  const variant = color ? tagColorMap[color] ?? 'secondary' : 'secondary';
  return (
    <Badge variant={variant} className={cn('font-medium', className)} {...props}>
      {children}
    </Badge>
  );
}

export { Badge, badgeVariants };
