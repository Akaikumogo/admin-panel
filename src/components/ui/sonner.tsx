import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useApp } from '@/Providers/Configuration';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useApp();
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        className: 'font-sans',
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-soft dark:group-[.toaster]:shadow-soft-dark',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
