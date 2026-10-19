import * as React from 'react';
import { cn } from '@/lib/utils';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  active?: boolean;
  paragraph?: { rows?: number };
  size?: string | number;
};

function SkeletonBase({ className, active, style, paragraph, size, ...props }: SkeletonProps) {
  void active;
  if (paragraph) {
    return (
      <div className={cn('space-y-2', className)} style={style} {...props}>
        {Array.from({ length: paragraph.rows ?? 3 }).map((_, i) => (
          <SkeletonLine key={i} className="h-3 w-full" />
        ))}
      </div>
    );
  }
  return (
    <SkeletonLine
      className={className}
      style={{
        width: typeof size === 'number' ? size : undefined,
        height: typeof size === 'number' ? size : undefined,
        ...style,
      }}
      {...props}
    />
  );
}

function SkeletonLine({
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-zinc-200/70 dark:bg-zinc-800/70',
        className,
      )}
      style={style}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/5" />
    </div>
  );
}

SkeletonBase.Button = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <SkeletonBase className={cn('h-9 w-24', className)} {...props} />
);

SkeletonBase.Input = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <SkeletonBase className={cn('h-9 w-full', className)} {...props} />
);

SkeletonBase.Avatar = ({ className, active, size, style, ...props }: SkeletonProps) => (
  <SkeletonBase
    className={cn('rounded-full', className)}
    active={active}
    size={size}
    style={style}
    {...props}
  />
);

export const Skeleton = SkeletonBase;
