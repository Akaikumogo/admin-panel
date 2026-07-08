import * as React from 'react';
import { Input as BaseInput } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

function PasswordInput({ className, ...props }: React.ComponentProps<'input'>) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <BaseInput type={show ? 'text' : 'password'} className={cn('pr-10', className)} {...props} />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function NumberInput({
  className,
  min,
  max,
  step = 1,
  value,
  onChange,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type' | 'onChange'> & {
  onChange?: (value: number | null) => void;
}) {
  return (
    <BaseInput
      type="number"
      min={min}
      max={max}
      step={step}
      className={className}
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        onChange?.(v === '' ? null : Number(v));
      }}
      {...props}
    />
  );
}

const Input = Object.assign(BaseInput, {
  Password: PasswordInput,
  TextArea: Textarea,
  Number: NumberInput,
  Group: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn('flex', className)}>{children}</div>
  ),
});

export { Input, PasswordInput, NumberInput as InputNumber, Textarea };
