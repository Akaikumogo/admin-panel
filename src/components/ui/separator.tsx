import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '@/lib/utils';

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      'shrink-0 bg-border',
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
      className,
    )}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

/** Ant Design Divider */
export function Divider({
  children,
  className,
  plain,
}: {
  children?: React.ReactNode;
  className?: string;
  plain?: boolean;
}) {
  if (children) {
    return (
      <div className={cn('relative flex items-center py-2', className)}>
        <Separator className="flex-1" />
        <span className={cn('px-3 text-xs text-muted-foreground', plain && 'font-normal')}>{children}</span>
        <Separator className="flex-1" />
      </div>
    );
  }
  return <Separator className={cn('my-4', className)} />;
}

export { Separator };
