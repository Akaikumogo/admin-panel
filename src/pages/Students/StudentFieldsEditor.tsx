import { useEffect, useState } from 'react';
import { Button, Input } from '@/components/ui';
import apiService from '@/services/api';
import type { StudentDetail } from '@/services/api';

type Props = {
  student: StudentDetail;
  onSaved: () => void;
};

export function StudentFieldsEditor({ student, onSaved }: Props) {
  const [firstName, setFirstName] = useState(student.firstName);
  const [lastName, setLastName] = useState(student.lastName);
  const [middleName, setMiddleName] = useState(student.middleName ?? '');
  const [division, setDivision] = useState(student.division ?? '');
  const [post, setPost] = useState(student.post ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFirstName(student.firstName);
    setLastName(student.lastName);
    setMiddleName(student.middleName ?? '');
    setDivision(student.division ?? '');
    setPost(student.post ?? '');
  }, [student]);

  const save = async () => {
    setSaving(true);
    try {
      await apiService.patchEmployeeFields(student.id, {
        firstName,
        lastName,
        middleName,
        division,
        post,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Ma’lumotlarni tahrirlash (Energo ID)
      </div>
      <Field label="Ism" value={firstName} onChange={setFirstName} fallback={student.firstName1c} />
      <Field label="Familiya" value={lastName} onChange={setLastName} fallback={student.lastName1c} />
      <Field label="Otasining ismi" value={middleName} onChange={setMiddleName} fallback={student.middleName1c} />
      <Field label="Bo‘lim" value={division} onChange={setDivision} fallback={student.division1c} />
      <Field label="Lavozim" value={post} onChange={setPost} fallback={student.post1c} hint="post1c bir xil bo‘lib, display har xil bo‘lishi mumkin" />
      <Button type="primary" loading={saving} onClick={save}>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  fallback?: string | null;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
      {fallback && fallback !== value ? (
        <div className="mt-1 text-xs text-slate-400">1C: {fallback}</div>
      ) : null}
      {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
    </div>
  );
}
