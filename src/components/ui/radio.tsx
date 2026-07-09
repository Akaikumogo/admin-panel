import * as React from 'react';
import { cn } from '@/lib/utils';

function RadioButton({
  value,
  children,
  disabled,
}: {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return <>{children}</>;
}

export function RadioGroup({
  value,
  onChange,
  options,
  className,
  buttonStyle,
  children,
}: {
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  options?: { label: React.ReactNode; value: string; disabled?: boolean }[];
  className?: string;
  buttonStyle?: string;
  children?: React.ReactNode;
}) {
  void buttonStyle;

  if (children) {
    const buttons = React.Children.toArray(children) as React.ReactElement[];
    return (
      <div className={cn('surface-segmented', className)}>
        {buttons.map((child) => {
          const childProps = child.props as { value: string; disabled?: boolean; children?: React.ReactNode };
          const val = childProps.value;
          const active = value === val;
          return (
            <button
              key={val}
              type="button"
              disabled={childProps.disabled}
              onClick={() => onChange?.({ target: { value: val } })}
              className={cn(
                'rounded-sm px-3 py-1.5 text-sm transition-colors',
                active ? 'surface-segmented-active' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {childProps.children}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {options?.map((opt) => (
        <label key={opt.value} className={cn('inline-flex items-center gap-2 text-sm', opt.disabled && 'opacity-50')}>
          <input
            type="radio"
            value={opt.value}
            checked={value === opt.value}
            disabled={opt.disabled}
            onChange={() => onChange?.({ target: { value: opt.value } })}
            className="h-4 w-4 accent-primary"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

export const Radio = {
  Group: RadioGroup,
  Button: RadioButton,
};
