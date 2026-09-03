import { cn } from '@/lib/utils';

/**
 * "O‘zbekiston milliy elektr tarmoqlari" AJ rasmiy emblemasi — dumaloq, bordersiz.
 * JPG oq cheti scale bilan kesiladi.
 */
export function UmetSeal({ className }: { className?: string }) {
  return (
    <span className={cn('relative block aspect-square overflow-hidden rounded-full', className)}>
      <img
        src="/umet-logo.jpg"
        alt=""
        className="absolute inset-0 h-full w-full scale-[1.28] object-cover"
        draggable={false}
      />
    </span>
  );
}
