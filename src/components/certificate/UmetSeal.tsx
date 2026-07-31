import { cn } from '@/lib/utils';

/**
 * "O‘zbekiston milliy elektr tarmoqlari" AJ rasmiy emblemasi — dumaloq muhr ko'rinishida.
 * Fayl public/ dan olinadi, shuning uchun chop etishda ham to'g'ri chiqadi.
 */
export function UmetSeal({ className }: { className?: string }) {
  return (
    <img
      src="/umet-logo.jpg"
      alt=""
      className={cn(
        'block aspect-square rounded-full object-cover bg-white',
        'border-[0.4cqw] border-white/85 shadow-[0_2px_10px_rgba(0,0,0,0.4)]',
        className,
      )}
      draggable={false}
    />
  );
}
