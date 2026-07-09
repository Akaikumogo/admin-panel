import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography } from '@/components/ui';
import { useTranslation } from '@/hooks/useTranslation';
import type { WeekdayHeatmap, WeekdayHeatmapCell } from '@/services/api';
import { useAnalyticsFilters, useAnalyticsQueryString } from './AnalyticsFilters';
import { cn } from '@/lib/utils';

const { Text } = Typography;

function cellBg(percent: number): string {
  if (percent >= 90) return 'bg-emerald-600/90 text-white';
  if (percent >= 75) return 'bg-emerald-500/70 text-white';
  if (percent >= 60) return 'bg-lime-500/60 text-foreground';
  if (percent >= 45) return 'bg-amber-500/55 text-foreground';
  if (percent >= 25) return 'bg-orange-500/50 text-foreground';
  if (percent > 0) return 'bg-red-500/45 text-foreground';
  return 'bg-muted/40 text-muted-foreground';
}

type Props = {
  data: WeekdayHeatmap;
};

export function BranchWeekdayHeatmap({ data }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { orgId } = useAnalyticsFilters();
  const qs = useAnalyticsQueryString();

  const branches = useMemo(() => {
    let list = data.branches;
    if (orgId) list = list.filter((b) => b.orgId === orgId);
    return [...list].sort((a, b) => {
      const avgA = a.cells.reduce((s, c) => s + c.percent, 0) / (a.cells.length || 1);
      const avgB = b.cells.reduce((s, c) => s + c.percent, 0) / (b.cells.length || 1);
      return avgB - avgA;
    });
  }, [data.branches, orgId]);

  if (!branches.length) {
    return (
      <Card className="shadow-sm border-0">
        <Text type="secondary">{t({ uz: "Ma'lumot yo'q", en: 'No data', ru: 'Нет данных' })}</Text>
      </Card>
    );
  }

  return (
    <Card
      className="shadow-sm border-0 overflow-hidden"
      title={t({ uz: 'Hafta kuni bo\'yicha bajarilish', en: 'Weekday completion', ru: 'Выполнение по дням недели' })}
      extra={
        data.rangeFrom && data.rangeTo ? (
          <Text type="secondary" className="text-xs">
            {data.rangeFrom} — {data.rangeTo}
          </Text>
        ) : null
      }
    >
      <p className="text-xs text-muted-foreground mb-4 -mt-2">
        {t({
          uz: 'Har katak: shu hafta kunidagi kunlik rejalar o\'rtachasi. Hisobda filialning BARCHA xodimlari (faol bo\'lmaganlar 0% hisoblanadi).',
          en: 'Each cell: average daily plan completion for that weekday. All branch employees are included (inactive = 0%).',
          ru: 'Каждая ячейка: среднее выполнение дневного плана в этот день недели. Учитываются ВСЕ сотрудники филиала.',
        })}
      </p>

      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {[
          { label: '90%+', cls: cellBg(95) },
          { label: '75–89%', cls: cellBg(80) },
          { label: '60–74%', cls: cellBg(65) },
          { label: '45–59%', cls: cellBg(50) },
          { label: '25–44%', cls: cellBg(35) },
          { label: '1–24%', cls: cellBg(10) },
          { label: '0%', cls: cellBg(0) },
        ].map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span className={cn('h-3 w-6 rounded-sm border border-border/50', item.cls)} />
            {item.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm min-w-[640px] border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/95 backdrop-blur text-left p-3 font-semibold min-w-[200px] border-b border-r">
                {t({ uz: 'Filial', en: 'Branch', ru: 'Филиал' })}
              </th>
              {data.weekdays.map((w) => (
                <th key={w} className="p-3 text-center font-semibold border-b min-w-[72px]">
                  {w}
                </th>
              ))}
              <th className="p-3 text-center font-semibold border-b min-w-[64px]">
                Ø
              </th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => {
              const avg =
                Math.round(
                  (b.cells.reduce((s, c) => s + c.percent, 0) / (b.cells.length || 1)) * 10,
                ) / 10;
              return (
                <tr key={b.orgId} className="hover:bg-muted/30 transition-colors">
                  <td className="sticky left-0 z-10 bg-card border-r border-b p-2">
                    <button
                      type="button"
                      className="text-left font-medium hover:text-primary line-clamp-2 max-w-[220px]"
                      title={b.orgName}
                      onClick={() => navigate(`/dashboard/analytics/branches/${b.orgId}${qs}`)}
                    >
                      {b.orgName}
                    </button>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {b.totalEmployees} {t({ uz: 'xodim', en: 'emp.', ru: 'сотр.' })}
                    </div>
                  </td>
                  {b.cells.map((c) => (
                    <HeatCell key={c.dow} cell={c} />
                  ))}
                  <td className={cn('border-b p-2 text-center font-semibold', cellBg(avg))}>
                    {avg}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function HeatCell({ cell }: { cell: WeekdayHeatmapCell }) {
  return (
    <td className="border-b p-1">
      <div
        className={cn(
          'mx-auto flex h-10 w-full max-w-[72px] items-center justify-center rounded-md text-xs font-semibold tabular-nums transition-transform hover:scale-105',
          cellBg(cell.percent),
        )}
        title={`${cell.percent}% · ${cell.sampleDays} kun o'rtacha`}
      >
        {cell.percent}%
      </div>
    </td>
  );
}
