import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-8',
        icon: 'h-9 w-9',
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
        type={htmlType}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" /> : icon}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
