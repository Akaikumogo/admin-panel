import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

type AvatarSize = number | 'small' | 'default' | 'large';

function sizeToPx(size: AvatarSize): number {
  if (typeof size === 'number') return size;
  if (size === 'small') return 28;
  if (size === 'large') return 48;
  return 40;
}

function fontSizeFor(px: number): string {
  if (px >= 72) return '1.5rem';
  if (px >= 48) return '1.125rem';
  if (px >= 36) return '0.875rem';
  return '0.75rem';
}

const AvatarRoot = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    size?: AvatarSize;
    icon?: React.ReactNode;
    style?: React.CSSProperties;
    src?: string;
    className?: string;
    children?: React.ReactNode;
  }
>(({ className, size = 'default', icon, style, src, children, ...props }, ref) => {
  const px = sizeToPx(size);
  const hasInitials = children != null && children !== false && children !== '';

  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        className,
      )}
      style={{ width: px, height: px, ...style }}
      {...props}
    >
      {src ? (
        <AvatarPrimitive.Image
          src={src}
          className="h-full w-full object-cover"
        />
      ) : null}
      {/*
        Muhim: children ni tashqarida chizmaslik — Fallback ichida bir marta.
        Aks holda initials ikki marta chiqib, yarim ko‘k/yarim kulrang bug bo‘ladi.
      */}
      <AvatarPrimitive.Fallback
        delayMs={src ? 400 : 0}
        className={cn(
          'flex h-full w-full items-center justify-center rounded-full',
          'bg-transparent font-semibold leading-none tracking-wide text-white',
          !src && !className?.includes('bg-') && !style?.background && !style?.backgroundColor
            ? 'bg-muted text-muted-foreground'
            : null,
        )}
        style={{ fontSize: fontSizeFor(px) }}
      >
        {icon ?? (hasInitials ? children : null)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
});
AvatarRoot.displayName = 'Avatar';

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-semibold leading-none',
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

const Avatar = Object.assign(AvatarRoot, { Image: AvatarImage, Fallback: AvatarFallback });

export { Avatar, AvatarImage, AvatarFallback };
