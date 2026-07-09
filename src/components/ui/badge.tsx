import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        warning: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        info: 'border-transparent bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
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
