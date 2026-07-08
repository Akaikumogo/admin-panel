import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function toDate(value?: Dayjs | null): Date | undefined {
  return value ? value.toDate() : undefined;
}

function DatePickerBase({
  value,
  onChange,
  placeholder = 'Sana tanlang',
  className,
  allowClear,
  picker,
  showTime,
  style,
  disabledDate,
}: {
  value?: Dayjs | null;
  onChange?: (date: Dayjs | null) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  picker?: 'date' | 'month';
  showTime?: boolean;
  style?: React.CSSProperties;
  disabledDate?: (current: Dayjs) => boolean;
}) {
  const [open, setOpen] = React.useState(false);

  if (picker === 'month') {
    const months = Array.from({ length: 12 }, (_, i) => i);
    const year = value?.year() ?? dayjs().year();
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground', className)}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? value.format('YYYY-MM') : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => onChange?.(dayjs(`${year - 1}-01-01`))}>‹</Button>
            <span className="text-sm font-medium">{year}</span>
            <Button variant="outline" size="sm" onClick={() => onChange?.(dayjs(`${year + 1}-01-01`))}>›</Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {months.map((m) => {
              const d = dayjs(`${year}-${String(m + 1).padStart(2, '0')}-01`);
              const active = value?.format('YYYY-MM') === d.format('YYYY-MM');
              return (
                <Button
                  key={m}
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { onChange?.(d); setOpen(false); }}
                >
                  {d.format('MMM')}
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" style={style} className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground', className)}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (showTime ? value.format('DD.MM.YYYY HH:mm') : value.format('DD.MM.YYYY')) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={toDate(value)}
          disabled={disabledDate ? (d) => disabledDate(dayjs(d)) : undefined}
          onSelect={(d) => {
            const next = d ? dayjs(d) : null;
            onChange?.(showTime && next ? next.hour(9).minute(0) : next);
            if (!showTime) setOpen(false);
          }}
        />
        {showTime && value ? (
          <div className="border-t p-2 flex gap-2">
            <input
              type="time"
              className="flex-1 rounded-md border px-2 py-1 text-sm"
              defaultValue={value.format('HH:mm')}
              onChange={(e) => {
                const [h, m] = e.target.value.split(':').map(Number);
                onChange?.(value.hour(h).minute(m));
              }}
            />
            <Button size="sm" onClick={() => setOpen(false)}>OK</Button>
          </div>
        ) : null}
        {allowClear && value ? (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange?.(null)}>Tozalash</Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function RangePicker({
  value,
  onChange,
  className,
  allowClear,
}: {
  value?: [Dayjs, Dayjs] | null;
  onChange?: (dates: [Dayjs, Dayjs] | null) => void;
  className?: string;
  allowClear?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const from = value?.[0];
  const to = value?.[1];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('justify-start text-left font-normal', className)}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {from && to ? `${format(from.toDate(), 'dd.MM.yyyy')} — ${format(to.toDate(), 'dd.MM.yyyy')}` : 'Oraliq tanlang'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from: toDate(from), to: toDate(to) }}
          onSelect={(range) => {
            if (range?.from && range?.to) {
              onChange?.([dayjs(range.from), dayjs(range.to)]);
              setOpen(false);
            }
          }}
          numberOfMonths={2}
        />
        {allowClear && value ? (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange?.(null)}>Tozalash</Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

const DatePicker = Object.assign(DatePickerBase, { RangePicker });

export { DatePicker };
