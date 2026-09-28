import { useState } from 'react';
import dayjs from 'dayjs';
import { CalendarDays, CalendarOff, Target, Users } from 'lucide-react';
import {
  Button,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Spin,
  Switch,
  Textarea,
  message,
} from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import { useFetch } from '@/hooks/useFetch';
import apiService, { type PlanCalendarDay } from '@/services/api';
import {
  PlanLegend,
  PlanMonthGrid,
  PlanMonthNav,
} from '@/components/plan-calendar/PlanMonthGrid';
import { PlanYearView } from '@/components/plan-calendar/PlanYearView';

type View = 'month' | 'year';

type EditState = {
  day: PlanCalendarDay;
  goal: number | null;
  isDayOff: boolean;
  holidayName: string;
  note: string;
};

function errorText(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { message?: unknown } } })?.response
    ?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return typeof msg === 'string' ? msg : fallback;
}

const PlanCalendarPage = () => {
  const { t } = useTranslation();
  const { data: perms } = useFetch(
    ['plan-permissions'],
    () => apiService.getPlanPermissions(),
    { canEdit: false },
  );
  const canEdit = perms.canEdit;
  const [month, setMonth] = useState(() => dayjs().format('YYYY-MM'));
  const [view, setView] = useState<View>('month');
  const [year, setYear] = useState(() => dayjs().format('YYYY'));
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, initialLoading, refetch } = useFetch(
    ['plan-calendar', month],
    () => apiService.getPlanCalendar(month),
    null,
  );

  const openDay = (date: string) => {
    const day = data?.days.find((d) => d.date === date);
    if (!day || !canEdit) return;
    if (!day.calendarApplies) {
      message.info(
        t({
          uz: `Kalendar ${data?.calendarStart} dan boshlab qo‘llanadi`,
          en: `Calendar applies from ${data?.calendarStart}`,
          ru: `Календарь действует с ${data?.calendarStart}`,
        }),
      );
      return;
    }
    setEdit({
      day,
      goal: day.customGoal,
      isDayOff: day.isDayOff,
      holidayName: day.holidayName ?? '',
      note: day.note ?? '',
    });
  };

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      await apiService.setPlanCalendarDay(edit.day.date, {
        goal: edit.goal,
        isDayOff: edit.isDayOff === edit.day.isWeekend ? null : edit.isDayOff,
        holidayName: edit.holidayName.trim() || null,
        note: edit.note.trim() || null,
      });
      message.success(t({ uz: 'Saqlandi', en: 'Saved', ru: 'Сохранено' }));
      setEdit(null);
      await refetch();
    } catch (e) {
      message.error(errorText(e, t({ uz: 'Xatolik', en: 'Error', ru: 'Ошибка' })));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      await apiService.resetPlanCalendarDay(edit.day.date);
      message.success(
        t({ uz: 'Standartga qaytarildi', en: 'Reset to default', ru: 'Сброшено' }),
      );
      setEdit(null);
      await refetch();
    } catch (e) {
      message.error(errorText(e, t({ uz: 'Xatolik', en: 'Error', ru: 'Ошибка' })));
    } finally {
      setSaving(false);
    }
  };

  const effectiveGoal = edit
    ? edit.goal ?? (edit.isDayOff ? 0 : data?.defaultGoal ?? 10)
    : 0;
  const daysOff = data?.days.filter((d) => d.calendarApplies && d.goal === 0).length ?? 0;
  const custom = data?.days.filter((d) => d.customGoal != null).length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <CalendarDays size={20} className="text-[var(--shell-rail)]" />
            {t({ uz: 'Plan kalendari', en: 'Plan calendar', ru: 'Календарь плана' })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            {t({
              uz: 'Hisoboti yoqilgan barcha xodimlar uchun kunlik plan. Shanba, yakshanba va bayram kunlari avtomatik 0. Kunni bosib hamma uchun normani o‘zgartiring; xodimning shaxsiy normasi uning sahifasida.',
              en: 'Daily plan for all report-active employees. Weekends and holidays are 0 automatically. Click a day to change the goal for everyone; personal goals are set on the employee page.',
              ru: 'Дневной план для всех сотрудников с включённым отчётом. Выходные и праздники — 0 автоматически. Нажмите на день, чтобы изменить норму для всех; личная норма — на странице сотрудника.',
            })}
          </p>
          {!canEdit ? (
            <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              {t({
                uz: 'Faqat ko‘rish: planni markaziy apparat xodimlari o‘zgartiradi.',
                en: 'View only: plans are changed by head-office staff.',
                ru: 'Только просмотр: план меняют сотрудники центрального аппарата.',
              })}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented<View>
            value={view}
            onChange={setView}
            options={[
              { value: 'month', label: t({ uz: 'Oylik', en: 'Monthly', ru: 'Месяц' }) },
              { value: 'year', label: t({ uz: 'Yillik', en: 'Yearly', ru: 'Год' }) },
            ]}
          />
          {view === 'month' ? <PlanMonthNav month={month} onChange={setMonth} /> : null}
        </div>
      </div>

      {view === 'year' ? (
        <PlanYearView
          year={year}
          onYearChange={setYear}
          onOpenMonth={(m) => {
            setMonth(m);
            setView('month');
          }}
        />
      ) : null}

      {view === 'month' && data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat
            icon={<Users size={16} />}
            label={t({ uz: 'Ish kunlari', en: 'Working days', ru: 'Рабочие дни' })}
            value={data.workingDays}
          />
          <Stat
            icon={<Target size={16} />}
            label={t({ uz: 'Oylik plan (1 xodim)', en: 'Monthly plan (per employee)', ru: 'План на месяц (1 сотр.)' })}
            value={data.totalGoal}
          />
          <Stat
            icon={<CalendarOff size={16} />}
            label={t({ uz: 'Dam olish kunlari', en: 'Days off', ru: 'Выходные' })}
            value={daysOff}
          />
          <Stat
            icon={<CalendarDays size={16} />}
            label={t({ uz: 'O‘zgartirilgan kunlar', en: 'Customized days', ru: 'Изменённые дни' })}
            value={custom}
          />
        </div>
      ) : null}

      <div
        className={
          view === 'month'
            ? 'bg-card border border-border rounded-lg p-4 sm:p-6 space-y-4'
            : 'hidden'
        }
      >
        {initialLoading || !data ? (
          <div className="flex items-center justify-center h-64">
            <Spin size="large" />
          </div>
        ) : (
          <>
            <PlanMonthGrid
              days={data.days.map((d) => ({
                date: d.date,
                goal: d.goal,
                isDayOff: d.isDayOff,
                holidayName: d.holidayName ?? d.note,
                calendarApplies: d.calendarApplies,
                customized: d.source === 'ADMIN',
              }))}
              defaultGoal={data.defaultGoal}
              onSelect={canEdit ? (d) => openDay(d.date) : undefined}
            />
            <PlanLegend defaultGoal={data.defaultGoal} />
          </>
        )}
      </div>

      <Modal
        open={!!edit}
        onCancel={() => setEdit(null)}
        title={
          edit
            ? `${dayjs(edit.day.date).format('DD.MM.YYYY')} — ${t({ uz: 'hamma uchun', en: 'for everyone', ru: 'для всех' })}`
            : ''
        }
        width={460}
        footer={
          edit ? (
            <div className="flex items-center justify-between gap-2">
              {edit.day.hasOverride ? (
                <Button danger onClick={reset} disabled={saving}>
                  {edit.day.source === 'HOLIDAY'
                    ? t({ uz: 'Bayramni o‘chirish', en: 'Remove holiday', ru: 'Удалить праздник' })
                    : t({ uz: 'Standartga qaytarish', en: 'Reset', ru: 'Сбросить' })}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button onClick={() => setEdit(null)} disabled={saving}>
                  {t({ uz: 'Bekor qilish', en: 'Cancel', ru: 'Отмена' })}
                </Button>
                <Button type="primary" onClick={save} loading={saving}>
                  {t({ uz: 'Saqlash', en: 'Save', ru: 'Сохранить' })}
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {edit ? (
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <span>
                <span className="block text-sm font-medium">
                  {t({ uz: 'Dam olish kuni', en: 'Day off', ru: 'Выходной день' })}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t({
                    uz: 'Yoqilsa plan 0 bo‘ladi (xodimlar bonus XP yig‘ishi mumkin)',
                    en: 'Plan becomes 0 (employees can earn bonus XP)',
                    ru: 'План станет 0 (сотрудники могут получить бонус XP)',
                  })}
                </span>
              </span>
              <Switch
                checked={edit.isDayOff}
                onChange={(v) =>
                  setEdit({ ...edit, isDayOff: v, goal: v ? null : edit.goal })
                }
              />
            </label>

            <div className="space-y-1.5">
              <span className="block text-sm font-medium">
                {t({ uz: 'Kunlik norma (to‘g‘ri javob)', en: 'Daily goal (correct answers)', ru: 'Дневная норма (правильных ответов)' })}
              </span>
              <InputNumber
                min={0}
                max={200}
                value={edit.goal ?? undefined}
                placeholder={
                  edit.isDayOff
                    ? '0'
                    : t({
                        uz: `Standart (${data?.defaultGoal ?? 10})`,
                        en: `Default (${data?.defaultGoal ?? 10})`,
                        ru: `Стандарт (${data?.defaultGoal ?? 10})`,
                      })
                }
                onChange={(v) => setEdit({ ...edit, goal: v })}
              />
              <p className="text-xs text-muted-foreground">
                {t({
                  uz: 'Bo‘sh qoldirilsa xodimning o‘z normasi (odatda 10) ishlaydi. 0 kiritilsa bu kun plan yo‘q.',
                  en: 'Leave empty to use each employee’s own goal (usually 10). 0 means no plan.',
                  ru: 'Пусто — личная норма сотрудника (обычно 10). 0 — плана нет.',
                })}
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="block text-sm font-medium">
                {t({ uz: 'Nomi (bayram / sabab)', en: 'Name (holiday / reason)', ru: 'Название (праздник / причина)' })}
              </span>
              <Input
                value={edit.holidayName}
                maxLength={200}
                onChange={(e) => setEdit({ ...edit, holidayName: e.target.value })}
              />
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

            <div className="rounded-md bg-muted/60 p-3 text-sm">
              {t({ uz: 'Natija', en: 'Result', ru: 'Итог' })}:{' '}
              <b>
                {effectiveGoal === 0
                  ? t({ uz: 'plan yo‘q (bonus kuni)', en: 'no plan (bonus day)', ru: 'плана нет (бонусный день)' })
                  : `${effectiveGoal} ${t({ uz: 'ta to‘g‘ri javob', en: 'correct answers', ru: 'правильных ответов' })}`}
              </b>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

export default PlanCalendarPage;
