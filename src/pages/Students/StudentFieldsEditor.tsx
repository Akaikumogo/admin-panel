import { useEffect, useMemo, useState } from 'react';
import { Button, Input } from '@/components/ui';
import apiService from '@/services/api';
import { cn } from '@/lib/utils';

/** Minimal shape for Energo ID display field edits (list or detail). */
export type EmployeeFieldsEditable = {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  division?: string | null;
  post?: string | null;
  firstName1c?: string | null;
  lastName1c?: string | null;
  middleName1c?: string | null;
  division1c?: string | null;
  post1c?: string | null;
};

type Props = {
  student: EmployeeFieldsEditable;
  onSaved: () => void;
  /** Compact grid layout for list expand panel */
  compact?: boolean;
  className?: string;
};

function required(value: string) {
  return value.trim().length > 0;
}

export function StudentFieldsEditor({
  student,
  onSaved,
  compact = false,
  className,
}: Props) {
  const [firstName, setFirstName] = useState(student.firstName);
  const [lastName, setLastName] = useState(student.lastName);
  const [middleName, setMiddleName] = useState(student.middleName ?? '');
  const [division, setDivision] = useState(student.division ?? '');
  const [post, setPost] = useState(student.post ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(student.firstName);
    setLastName(student.lastName);
    setMiddleName(student.middleName ?? '');
    setDivision(student.division ?? '');
    setPost(student.post ?? '');
    setError(null);
  }, [student]);

  const missing = useMemo(() => {
    const empty: string[] = [];
    if (!required(firstName)) empty.push('Ism');
    if (!required(lastName)) empty.push('Familiya');
    if (!required(middleName)) empty.push('Otasining ismi');
    if (!required(division)) empty.push('Bo‘lim');
    if (!required(post)) empty.push('Lavozim');
    return empty;
  }, [firstName, lastName, middleName, division, post]);

  const save = async () => {
    if (missing.length) {
      setError(`Bo‘sh maydon: ${missing.join(', ')}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Display / field-overrides only — does not overwrite *1c source fields
      await apiService.patchEmployeeFields(student.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName.trim(),
        division: division.trim(),
        post: post.trim(),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saqlab bo‘lmadi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn(
        'space-y-3 rounded-lg border border-border bg-muted/20 p-4',
        !compact && 'mt-4',
        className,
      )}
      data-stop-row-click
    >
      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Ma’lumotlarni tahrirlash (Energo ID)
      </div>
      <div
        className={cn(
          compact
            ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'
            : 'space-y-3',
        )}
      >
        <Field
          label="Ism"
          value={firstName}
          onChange={setFirstName}
          fallback={student.firstName1c}
          invalid={!required(firstName)}
        />
        <Field
          label="Familiya"
          value={lastName}
          onChange={setLastName}
          fallback={student.lastName1c}
          invalid={!required(lastName)}
        />
        <Field
          label="Otasining ismi"
          value={middleName}
          onChange={setMiddleName}
          fallback={student.middleName1c}
          invalid={!required(middleName)}
        />
        <Field
          label="Bo‘lim"
          value={division}
          onChange={setDivision}
          fallback={student.division1c}
          invalid={!required(division)}
        />
        <Field
          label="Lavozim"
          value={post}
          onChange={setPost}
          fallback={student.post1c}
          hint="post1c bir xil bo‘lib, display har xil bo‘lishi mumkin"
          invalid={!required(post)}
        />
      </div>
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
      {missing.length > 0 ? (
        <div className="text-xs text-red-600">
          Bo‘sh maydonlarni to‘ldiring: {missing.join(', ')}
        </div>
      ) : null}
      <Button
        type="primary"
        loading={saving}
        disabled={missing.length > 0 || saving}
        onClick={save}
      >
        Saqlash
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  fallback,
  hint,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  fallback?: string | null;
  hint?: string;
  invalid?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={invalid ? 'border-red-500 focus-visible:ring-red-500' : undefined}
        aria-invalid={invalid || undefined}
      />
      {fallback?.trim() && fallback !== value ? (
        <div className="mt-1 text-xs text-slate-400">1C: {fallback}</div>
      ) : null}
      {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
    </div>
  );
}
