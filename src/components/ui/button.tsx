import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium tracking-tight transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-[var(--primary-hover)]',
        destructive:
          'bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/90',
        outline:
          'border border-border bg-card text-foreground shadow-none hover:border-border hover:bg-muted/70',
        secondary:
          'bg-secondary text-secondary-foreground shadow-none hover:bg-secondary/80',
        ghost: 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline shadow-none',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-2.5 text-[13px]',
        lg: 'h-12 rounded-xl px-5 text-[15px]',
        icon: 'h-9 w-9 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type AntdButtonType = 'primary' | 'default' | 'dashed' | 'link' | 'text';
type AntdButtonSize = 'small' | 'middle' | 'large';

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'>,
    Omit<VariantProps<typeof buttonVariants>, 'size'> {
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  danger?: boolean;
  block?: boolean;
  iconPosition?: string;
  htmlType?: 'button' | 'submit' | 'reset';
  type?: AntdButtonType;
  size?: AntdButtonSize | NonNullable<VariantProps<typeof buttonVariants>['size']>;
}

function mapAntdType(type?: AntdButtonType, danger?: boolean): VariantProps<typeof buttonVariants>['variant'] {
  if (danger) return 'destructive';
  if (type === 'primary') return 'default';
  if (type === 'link' || type === 'text') return 'link';
  return 'outline';
}

function mapAntdSize(size?: AntdButtonSize | VariantProps<typeof buttonVariants>['size']): VariantProps<typeof buttonVariants>['size'] {
  if (size === 'small') return 'sm';
  if (size === 'large') return 'lg';
  if (size === 'middle') return 'default';
  return (size as VariantProps<typeof buttonVariants>['size']) ?? 'default';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading,
      children,
      disabled,
      icon,
      danger,
      block,
      iconPosition,
      htmlType = 'button',
      type: antdType = 'default',
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    void iconPosition;
    const resolvedVariant = variant ?? mapAntdType(antdType, danger);
    const resolvedSize = mapAntdSize(size);

    return (
      <Comp
        className={cn(buttonVariants({ variant: resolvedVariant, size: resolvedSize, className }), block && 'w-full')}
        ref={ref}
        type={asChild ? undefined : htmlType}
        disabled={asChild ? undefined : disabled || loading}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading ? <Loader2 className="animate-spin" /> : icon}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
