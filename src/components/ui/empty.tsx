import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Empty({
  description = 'Ma\'lumot yo\'q',
  image,
  className,
}: {
  description?: React.ReactNode;
  image?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center text-muted-foreground', className)}>
      {image ?? <Inbox className="mb-3 h-12 w-12 opacity-40" />}
      <p className="text-sm">{description}</p>
    </div>
  );
}

Empty.PRESENTED_IMAGE_SIMPLE = null;
