import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const TabsRoot = TabsPrimitive.Root;
const TabsListBase = TabsPrimitive.List;
const TabsTriggerBase = TabsPrimitive.Trigger;
const TabsContentBase = TabsPrimitive.Content;

/** Ant Design Tabs API */
export function Tabs({
  activeKey,
  defaultActiveKey,
  onChange,
  items = [],
  className,
  tabBarExtraContent,
}: {
  activeKey?: string;
  defaultActiveKey?: string;
  onChange?: (key: string) => void;
  items?: { key: string; label: React.ReactNode; children: React.ReactNode; disabled?: boolean }[];
  className?: string;
  tabBarExtraContent?: React.ReactNode;
}) {
  return (
    <TabsRoot
      value={activeKey}
      defaultValue={defaultActiveKey ?? items[0]?.key}
      onValueChange={onChange}
      className={className}
    >
      <div className="flex items-center justify-between gap-4">
        <TabsListBase className="surface-segmented h-10 items-center justify-center text-muted-foreground">
          {items.map((item) => (
            <TabsTriggerBase
              key={item.key}
              value={item.key}
              disabled={item.disabled}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:surface-segmented-active data-[state=active]:text-foreground"
            >
              {item.label}
            </TabsTriggerBase>
          ))}
        </TabsListBase>
        {tabBarExtraContent}
      </div>
      {items.map((item) => (
        <TabsContentBase key={item.key} value={item.key} className="mt-4 focus-visible:outline-none">
          {item.children}
        </TabsContentBase>
      ))}
    </TabsRoot>
  );
}

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsListBase ref={ref} className={cn('surface-segmented h-10 items-center justify-center text-muted-foreground', className)} {...props} />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsTriggerBase
    ref={ref}
    className={cn('inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:surface-segmented-active data-[state=active]:text-foreground', className)}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsContentBase ref={ref} className={cn('mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)} {...props} />
));
TabsContent.displayName = 'TabsContent';

export { TabsRoot };
