import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

const AvatarRoot = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    size?: number | 'small' | 'default' | 'large';
    icon?: React.ReactNode;
    style?: React.CSSProperties;
    src?: string;
    className?: string;
    children?: React.ReactNode;
  }
>(({ className, size = 'default', icon, style, src, children, ...props }, ref) => {
  const px = typeof size === 'number' ? size : size === 'small' ? 28 : size === 'large' ? 48 : 40;
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn('relative flex shrink-0 overflow-hidden rounded-full', className)}
      style={{ width: px, height: px, ...style }}
      {...props}
    >
      {src ? <AvatarPrimitive.Image src={src} className="aspect-square h-full w-full" /> : null}
      {children}
      {(icon || (!src && children)) ? (
        <AvatarPrimitive.Fallback className="flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium">
          {icon ?? children}
        </AvatarPrimitive.Fallback>
      ) : null}
    </AvatarPrimitive.Root>
  );
});
AvatarRoot.displayName = 'Avatar';

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn('aspect-square h-full w-full', className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn('flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium', className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

const Avatar = Object.assign(AvatarRoot, { Image: AvatarImage, Fallback: AvatarFallback });

export { Avatar, AvatarImage, AvatarFallback };
