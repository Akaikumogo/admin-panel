import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { filterSelectOption } from '@/utils/selectSearch.util';

export type SelectOption = { value: string | number; label: React.ReactNode; disabled?: boolean };

function optionSearchText(opt: SelectOption): string {
  return String(opt.label ?? opt.value ?? '');
}

function SearchSelectInner({
  value,
  onChange,
  options = [],
  placeholder = 'Tanlang...',
  searchPlaceholder = 'Qidirish...',
  className,
  style,
  disabled,
  showSearch = true,
  popupClassName,
  allowClear,
  prefix,
}: {
  value?: string | number | null;
  onChange?: (value: string) => void;
  options?: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  showSearch?: boolean;
  popupClassName?: string;
  allowClear?: boolean;
  prefix?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const selected = React.useMemo(
    () => options.find((o) => String(o.value) === String(value)),
    [options, value],
  );

  const filteredOptions = React.useMemo(() => {
    if (!showSearch || !search.trim()) return options;
    return options.filter((opt) => filterSelectOption(search, opt));
  }, [options, search, showSearch]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          style={style}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            {prefix}
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn('w-[var(--radix-popover-trigger-width)] p-0', popupClassName)}
        align="start"
        onOpenAutoFocus={(e) => {
          if (showSearch) e.preventDefault();
        }}
      >
        <Command shouldFilter={false} className="select-long-options">
          {showSearch ? (
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
          ) : null}
          <CommandList>
            <CommandEmpty>Topilmadi</CommandEmpty>
            <CommandGroup>
              {allowClear && value ? (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange?.('');
                    setOpen(false);
                  }}
                >
                  Tozalash
                </CommandItem>
              ) : null}
              {filteredOptions.map((opt) => (
                <CommandItem
                  key={String(opt.value)}
                  value={`${String(opt.value)}-${optionSearchText(opt)}`}
                  disabled={opt.disabled}
                  onSelect={() => {
                    onChange?.(String(opt.value));
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      String(value) === String(opt.value) ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export const SearchSelect = React.memo(SearchSelectInner);

export function Select(props: Record<string, unknown>) {
  const {
    value,
    onChange,
    options = [],
    placeholder,
    className,
    style,
    disabled,
    showSearch,
    popupClassName,
    size,
    allowClear,
    prefix,
  } = props as {
    value?: string | string[] | number | null;
    onChange?: (value: string | string[]) => void;
    options?: SelectOption[];
    placeholder?: string;
    className?: string;
    style?: React.CSSProperties;
    disabled?: boolean;
    showSearch?: boolean;
    popupClassName?: string;
    size?: 'small' | 'middle' | 'large';
    allowClear?: boolean;
    prefix?: React.ReactNode;
    loading?: boolean;
    optionFilterProp?: string;
    filterOption?: boolean | ((input: string, option?: SelectOption) => boolean);
    onSearch?: (value: string) => void;
  };

  void props;

  const sizeClass = size === 'large' ? 'h-11' : size === 'small' ? 'h-8 text-xs' : 'h-9';
  const strValue = Array.isArray(value) ? value[0] : value;

  return (
    <SearchSelect
      value={strValue}
      onChange={(v) => onChange?.(v as string & string[])}
      options={options}
      placeholder={placeholder}
      className={cn(sizeClass, className)}
      style={style}
      disabled={disabled}
      showSearch={showSearch ?? false}
      popupClassName={popupClassName}
      allowClear={allowClear}
      prefix={prefix}
    />
  );
}
