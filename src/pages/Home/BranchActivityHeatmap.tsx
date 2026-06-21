import type { HomeBranchHeatmapRow } from '@/services/api';

const levelColor = (count: number, max: number) => {
  if (count <= 0 || max <= 0) return 'bg-slate-100 dark:bg-slate-800';
  const ratio = count / max;
  if (ratio >= 0.75) return 'bg-emerald-500';
  if (ratio >= 0.5) return 'bg-emerald-400';
  if (ratio >= 0.25) return 'bg-emerald-300';
  return 'bg-emerald-200 dark:bg-emerald-900/60';
};

interface Props {
  rows: HomeBranchHeatmapRow[];
}

export function BranchActivityHeatmap({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="text-sm text-slate-500 py-8 text-center">
        Hozircha filial bo&apos;yicha login ma&apos;lumoti yo&apos;q
      </div>
    );
  }

  const weekLabels = rows[0]?.weeks.map((w) => w.weekStart.slice(5)) ?? [];
  const maxCount = Math.max(
    1,
    ...rows.flatMap((r) => r.weeks.map((w) => w.count)),
  );

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div
          className="grid gap-1 items-center mb-2"
          style={{
            gridTemplateColumns: `minmax(180px, 1.4fr) repeat(${weekLabels.length}, minmax(28px, 1fr))`,
          }}
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Filial
          </div>
          {weekLabels.map((label) => (
            <div
              key={label}
              className="text-[10px] text-center text-slate-400 font-medium"
            >
              {label}
            </div>
          ))}
        </div>

        {rows.map((row) => (
          <div
            key={row.orgId}
            className="grid gap-1 items-center py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
            style={{
              gridTemplateColumns: `minmax(180px, 1.4fr) repeat(${row.weeks.length}, minmax(28px, 1fr))`,
            }}
          >
            <div className="min-w-0 pr-2">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                {row.isDefault && (
                  <span className="text-amber-600 dark:text-amber-400 mr-1">★</span>
                )}
                {row.orgName}
              </div>
              <div className="text-[11px] text-slate-400">
                {row.totalLogins} login (12 hafta)
              </div>
            </div>
            {row.weeks.map((week) => (
              <div
                key={`${row.orgId}-${week.weekStart}`}
                title={`${week.weekStart}: ${week.count} login`}
                className={`h-7 rounded-md ${levelColor(week.count, maxCount)} transition-colors`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
