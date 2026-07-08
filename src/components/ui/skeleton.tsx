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
          <div key={i} className="h-3 w-full animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      style={{
        width: typeof size === 'number' ? size : undefined,
        height: typeof size === 'number' ? size : undefined,
        ...style,
      }}
      {...props}
    />
  );
}

SkeletonBase.Button = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <SkeletonBase className={cn('h-9 w-24', className)} {...props} />
);

SkeletonBase.Input = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <SkeletonBase className={cn('h-9 w-full', className)} {...props} />
);

SkeletonBase.Avatar = ({ className, active, size, style, ...props }: SkeletonProps) => (
  <SkeletonBase className={cn('rounded-full', className)} active={active} size={size} style={style} {...props} />
);

export const Skeleton = SkeletonBase;
