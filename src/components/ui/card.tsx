import * as React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

const CardBase = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('min-w-0 rounded-2xl border bg-card text-card-foreground shadow-sm', className)}
      {...props}
    />
  ),
);
CardBase.displayName = 'Card';

function Card({
  title,
  extra,
  loading,
  children,
  className,
  bodyStyle,
  size,
  ...props
}: Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> & {
  title?: React.ReactNode;
  extra?: React.ReactNode;
  loading?: boolean;
  bodyStyle?: React.CSSProperties;
  size?: string;
}) {
  void size;
  return (
    <CardBase className={cn('relative', className)} {...props}>
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/60">
          <Spinner size={28} />
        </div>
      ) : null}
      {(title || extra) && (
        <div className="flex items-center justify-between border-b px-6 py-4">
          {title ? <div className="font-semibold">{title}</div> : <span />}
          {extra}
        </div>
      )}
      <div className={cn('min-w-0 p-6', loading && 'opacity-60')} style={bodyStyle}>{children}</div>
    </CardBase>
  );
}

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('font-semibold leading-none tracking-tight', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
