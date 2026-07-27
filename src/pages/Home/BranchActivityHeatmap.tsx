import type { HomeBranchHeatmapRow } from '@/services/api';
import { Tooltip } from '@/components/ui';
import { shortBranchName } from './branchName';
import { cn } from '@/lib/utils';

const levelColor = (count: number, max: number) => {
  if (count <= 0 || max <= 0) return 'bg-muted';
  const ratio = count / max;
  if (ratio >= 0.75) return 'bg-blue-500';
  if (ratio >= 0.5) return 'bg-blue-400/90';
  if (ratio >= 0.25) return 'bg-blue-300/80 dark:bg-blue-700/70';
  return 'bg-blue-200/70 dark:bg-blue-900/50';
};

interface Props {
  rows: HomeBranchHeatmapRow[];
}

export function BranchActivityHeatmap({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Hozircha filial bo‘yicha login maʼlumoti yoʻq
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
      <div className="min-w-[760px]">
        <div
          className="mb-2 grid items-center gap-1"
          style={{
            gridTemplateColumns: `minmax(140px, 1.1fr) repeat(${weekLabels.length}, minmax(28px, 1fr))`,
          }}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Filial
          </div>
          {weekLabels.map((label) => (
            <div
              key={label}
              className="text-center text-[10px] font-medium text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>

        {rows.map((row) => {
          const short = shortBranchName(row.orgName);
          return (
            <div
              key={row.orgId}
              className="grid items-center gap-1 border-b border-border/60 py-1.5 last:border-0"
              style={{
                gridTemplateColumns: `minmax(140px, 1.1fr) repeat(${row.weeks.length}, minmax(28px, 1fr))`,
              }}
            >
              <div className="min-w-0 pr-2">
                <Tooltip title={row.orgName} placement="topLeft">
                  <div className="cursor-default truncate text-sm font-semibold text-foreground">
                    {row.isDefault ? (
                      <span className="mr-1 text-amber-500">★</span>
                    ) : null}
                    {short}
                  </div>
                </Tooltip>
                <div className="text-[11px] tabular-nums text-muted-foreground">
                  {row.totalLogins.toLocaleString()} login · 12 hafta
                </div>
              </div>
              {row.weeks.map((week) => {
                const share =
                  row.totalLogins > 0
                    ? Math.round((week.count / row.totalLogins) * 100)
                    : 0;
                return (
                  <Tooltip
                    key={`${row.orgId}-${week.weekStart}`}
                    title={
                      <div className="space-y-0.5 py-0.5 text-left">
                        <div className="font-semibold">{week.weekStart}</div>
                        <div>Login: {week.count.toLocaleString()}</div>
                        <div>Ulushi: {share}%</div>
                        <div className="opacity-80">{short}</div>
                      </div>
                    }
                  >
                    <div
                      className={cn(
                        'h-7 rounded-md transition-transform hover:scale-105 hover:ring-1 hover:ring-ring/40',
                        levelColor(week.count, maxCount),
                      )}
                    />
                  </Tooltip>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
