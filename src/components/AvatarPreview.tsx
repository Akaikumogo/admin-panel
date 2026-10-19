import { useState } from 'react';
import { ZoomIn } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type AvatarPreviewProps = {
  src?: string | null;
  name: string;
  initials?: string;
  size?: number;
  className?: string;
  avatarClassName?: string;
};

/**
 * Jadvaldagi avatar: hoverda kichik preview, clickda katta modal.
 * Rasm bo‘lmasa oddiy initials avatar (click yo‘q).
 */
export function AvatarPreview({
  src,
  name,
  initials,
  size = 36,
  className,
  avatarClassName,
}: AvatarPreviewProps) {
  const [open, setOpen] = useState(false);
  const hasImage = Boolean(src);

  const avatar = (
    <Avatar
      size={size}
      src={src || undefined}
      className={cn('ring-1 ring-border/60', avatarClassName)}
    >
      {initials || name.slice(0, 2).toUpperCase()}
    </Avatar>
  );

  if (!hasImage) {
    return <span className={cn('inline-flex shrink-0', className)}>{avatar}</span>;
  }

  return (
    <>
      <TooltipProvider delayDuration={180}>
        <TooltipRoot>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
              className={cn(
                'group relative inline-flex shrink-0 rounded-full outline-none',
                'focus-visible:ring-2 focus-visible:ring-ring/40',
                'cursor-zoom-in',
                className,
              )}
              aria-label={`${name} — rasmni ko‘rish`}
            >
              {avatar}
              <span
                className={cn(
                  'pointer-events-none absolute inset-0 flex items-center justify-center rounded-full',
                  'bg-black/0 text-white opacity-0 transition',
                  'group-hover:bg-black/35 group-hover:opacity-100',
                )}
              >
                <ZoomIn className="h-3.5 w-3.5 drop-shadow" />
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={10}
            className="border border-border bg-card p-1.5 text-foreground shadow-lg"
          >
            <img
              src={src!}
              alt={name}
              className="h-28 w-28 rounded-lg object-cover"
            />
          </TooltipContent>
        </TooltipRoot>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm gap-0 overflow-hidden p-0 sm:rounded-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{name}</DialogTitle>
          </DialogHeader>
          <img
            src={src!}
            alt={name}
            className="aspect-square w-full object-cover"
          />
          <div className="border-t border-border px-4 py-3">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              {name}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
