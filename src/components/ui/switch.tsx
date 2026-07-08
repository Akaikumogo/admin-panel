import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
    size?: 'small' | 'default';
    checkedChildren?: React.ReactNode;
    unCheckedChildren?: React.ReactNode;
    onChange?: (checked: boolean) => void;
  }
>(({ className, size, checkedChildren, unCheckedChildren, onChange, onCheckedChange, ...props }, ref) => (
  <label className="inline-flex items-center gap-2 cursor-pointer">
    {unCheckedChildren && !props.checked ? <span className="text-xs">{unCheckedChildren}</span> : null}
    <SwitchPrimitives.Root
      className={cn(
        'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
        size === 'small' ? 'h-4 w-7' : 'h-5 w-9',
        className,
      )}
      onCheckedChange={(v) => {
        onCheckedChange?.(v);
        onChange?.(v);
      }}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          'pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform',
          size === 'small'
            ? 'h-3 w-3 data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0'
            : 'h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
        )}
      />
    </SwitchPrimitives.Root>
    {checkedChildren && props.checked ? <span className="text-xs">{checkedChildren}</span> : null}
  </label>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
