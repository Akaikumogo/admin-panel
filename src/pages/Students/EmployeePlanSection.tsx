import { useState } from 'react';
import dayjs from 'dayjs';
import { Target } from 'lucide-react';
import {
  Button,
  InputNumber,
  Modal,
  Spin,
  Textarea,
  message,
} from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService, { type UserPlanDay, type UserProfile } from '@/services/api';
import {
  PlanLegend,
  PlanMonthGrid,
  PlanMonthNav,
} from '@/components/plan-calendar/PlanMonthGrid';

function errorText(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { message?: unknown } } })?.response
    ?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return typeof msg === 'string' ? msg : fallback;
}

export function EmployeePlanSection({
  userId,
  me,
}: {
  userId: string;
  me: UserProfile | null;
}) {
  const { t } = useTranslation();
  const { data: perms } = useFetch(
    ['plan-permissions', me?.id],
    () => apiService.getPlanPermissions(),
    { canEdit: false },
  );
  const canEdit = perms.canEdit;
  const [month, setMonth] = useState(() => dayjs().format('YYYY-MM'));
  const [normDraft, setNormDraft] = useState<number | null | undefined>(undefined);
  const [edit, setEdit] = useState<{ day: UserPlanDay; goal: number | null; note: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, initialLoading, refetch } = useFetch(
    ['user-plan', userId, month],
    () => apiService.getUserPlan(userId, month),
    null,
  );

  const norm = normDraft === undefined ? data?.dailyPlanGoal ?? null : normDraft;
  const normDirty = normDraft !== undefined && normDraft !== (data?.dailyPlanGoal ?? null);
  const fail = (e: unknown) =>
    message.error(errorText(e, t({ uz: 'Xatolik', en: 'Error', ru: 'Ошибка' })));

  const saveNorm = async () => {
    setSaving(true);
    try {
      await apiService.setUserPlanNorm(userId, norm);
      setNormDraft(undefined);
      message.success(t({ uz: 'Saqlandi', en: 'Saved', ru: 'Сохранено' }));
      await refetch();
    } catch (e) {
      fail(e);
    } finally {
      setSaving(false);
    }
  };

  const saveDay = async () => {
    if (!edit) return;
    if (edit.goal == null) {
      message.warning(t({ uz: 'Normani kiriting', en: 'Enter a goal', ru: 'Введите норму' }));
      return;
    }
    setSaving(true);
    try {
      await apiService.setUserPlanDay(userId, edit.day.date, {
        goal: edit.goal,
        note: edit.note.trim() || null,
      });
      setEdit(null);
      message.success(t({ uz: 'Saqlandi', en: 'Saved', ru: 'Сохранено' }));
      await refetch();
    } catch (e) {
      fail(e);
    } finally {
      setSaving(false);
    }
  };

  const resetDay = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      await apiService.resetUserPlanDay(userId, edit.day.date);
      setEdit(null);
      await refetch();
    } catch (e) {
      fail(e);
    } finally {
      setSaving(false);
    }
  };

  const openDay = (date: string) => {
    const day = data?.days.find((d) => d.date === date);
    if (!day || !canEdit || !day.calendarApplies) return;
    setEdit({ day, goal: day.userGoal ?? day.goal, note: day.note ?? '' });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Target size={16} className="text-[var(--shell-rail)]" />
            {t({ uz: 'Shaxsiy plan', en: 'Personal plan', ru: 'Личный план' })}
          </h3>
          {data ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {t({ uz: 'Oy bo‘yicha', en: 'This month', ru: 'За месяц' })}:{' '}
              <b>{data.totalGoal}</b>{' '}
              {t({ uz: 'ta to‘g‘ri javob', en: 'correct answers', ru: 'правильных ответов' })} ·{' '}
              <b>{data.workingDays}</b>{' '}
              {t({ uz: 'ish kuni', en: 'working days', ru: 'рабочих дней' })}
            </p>
          ) : null}
        </div>
        <PlanMonthNav month={month} onChange={setMonth} />
      </div>

      {initialLoading || !data ? (
        <div className="flex items-center justify-center h-40">
          <Spin />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3 rounded-md border border-border p-3">
            <div className="space-y-1">
              <span className="block text-sm font-medium">
                {t({ uz: 'Doimiy kunlik norma', en: 'Permanent daily goal', ru: 'Постоянная дневная норма' })}
              </span>
              <div className="w-44">
                <InputNumber
                  min={0}
                  max={200}
                  disabled={!canEdit}
                  value={norm ?? undefined}
                  placeholder={t({
                    uz: `Standart (${data.defaultGoal})`,
                    en: `Default (${data.defaultGoal})`,
                    ru: `Стандарт (${data.defaultGoal})`,
                  })}
                  onChange={(v) => setNormDraft(v)}
                />
              </div>
            </div>
            {canEdit ? (
              <Button type="primary" onClick={saveNorm} loading={saving} disabled={!normDirty}>
                {t({ uz: 'Saqlash', en: 'Save', ru: 'Сохранить' })}
              </Button>
            ) : null}
            <p className="basis-full text-xs text-muted-foreground">
              {t({
                uz: 'Ish kunlari uchun amal qiladi. Dam olish va bayram kunlari baribir 0; aniq kunni o‘zgartirish uchun kalendardagi kunni bosing.',
                en: 'Applies to working days. Weekends and holidays stay 0; click a day below to change a specific date.',
                ru: 'Действует в рабочие дни. Выходные и праздники остаются 0; нажмите на день, чтобы изменить конкретную дату.',
              })}
            </p>
          </div>

          <PlanMonthGrid
            compact
            days={data.days.map((d) => ({
              date: d.date,
              goal: d.goal,
              isDayOff: d.isDayOff,
              holidayName: d.holidayName,
              calendarApplies: d.calendarApplies,
              customized: d.userGoal != null,
            }))}
            defaultGoal={data.defaultGoal}
            onSelect={canEdit ? (d) => openDay(d.date) : undefined}
          />
          <PlanLegend defaultGoal={data.defaultGoal} />
        </>
      )}

      <Modal
        open={!!edit}
        onCancel={() => setEdit(null)}
        title={edit ? `${dayjs(edit.day.date).format('DD.MM.YYYY')} — ${data?.fullName ?? ''}` : ''}
        width={420}
        footer={
          edit ? (
            <div className="flex items-center justify-between gap-2">
              {edit.day.userGoal != null ? (
                <Button danger onClick={resetDay} disabled={saving}>
                  {t({ uz: 'Standartga qaytarish', en: 'Reset', ru: 'Сбросить' })}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button onClick={() => setEdit(null)} disabled={saving}>
                  {t({ uz: 'Bekor qilish', en: 'Cancel', ru: 'Отмена' })}
                </Button>
                <Button type="primary" onClick={saveDay} loading={saving}>
                  {t({ uz: 'Saqlash', en: 'Save', ru: 'Сохранить' })}
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {edit ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t({ uz: 'Hamma uchun norma', en: 'Goal for everyone', ru: 'Норма для всех' })}:{' '}
              <b>{edit.day.baseGoal}</b>
              {edit.day.holidayName ? ` · ${edit.day.holidayName}` : ''}
            </p>
            <div className="space-y-1.5">
              <span className="block text-sm font-medium">
                {t({ uz: 'Shu kun uchun norma', en: 'Goal for this day', ru: 'Норма на этот день' })}
              </span>
              <InputNumber
                min={0}
                max={200}
                value={edit.goal ?? undefined}
                onChange={(v) => setEdit({ ...edit, goal: v })}
              />
              <p className="text-xs text-muted-foreground">
                {t({
                  uz: '0 — bu kun xodim uchun plan yo‘q.',
                  en: '0 — no plan for this employee on this day.',
                  ru: '0 — у сотрудника в этот день нет плана.',
                })}
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="block text-sm font-medium">
                {t({ uz: 'Izoh', en: 'Note', ru: 'Комментарий' })}
              </span>
              <Textarea
                rows={2}
                maxLength={500}
                value={edit.note}
                onChange={(e) => setEdit({ ...edit, note: e.target.value })}
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
