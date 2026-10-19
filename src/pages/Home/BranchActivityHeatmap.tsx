import type { HomeBranchHeatmapRow } from '@/services/api';
import { Tooltip } from '@/components/ui';
import { shortBranchName } from './branchName';
import { cn } from '@/lib/utils';

const levelColor = (count: number, max: number) => {
  if (count <= 0 || max <= 0) return 'bg-muted';
  const ratio = count / max;
  if (ratio >= 0.75) return 'bg-accent-600';
  if (ratio >= 0.5) return 'bg-accent-500';
  if (ratio >= 0.25) return 'bg-accent-300 dark:bg-accent-700/80';
  return 'bg-accent-100 dark:bg-accent-900/60';
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
  const avgTotal =
    rows.reduce((s, r) => s + r.totalLogins, 0) / Math.max(1, rows.length);

  /** Last 2 weeks quiet vs earlier baseline */
  const quietBranches = rows.filter((r) => {
    if (r.weeks.length < 4) return false;
    const recent =
      (r.weeks[r.weeks.length - 1]?.count ?? 0) +
      (r.weeks[r.weeks.length - 2]?.count ?? 0);
    const earlier = r.weeks
      .slice(0, -2)
      .reduce((s, w) => s + w.count, 0);
    const earlierAvg = earlier / Math.max(1, r.weeks.length - 2);
    return earlierAvg > 5 && recent < earlierAvg * 0.35;
  });

  const hotBranches = rows.filter((r) => r.totalLogins >= avgTotal * 1.6);

  return (
    <div className="flex h-full flex-col gap-3">
      {(quietBranches.length > 0 || hotBranches.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {quietBranches.slice(0, 2).map((r) => (
            <span
              key={`q-${r.orgId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:text-amber-300"
              title={r.orgName}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Past: {shortBranchName(r.orgName)}
            </span>
          ))}
          {hotBranches.slice(0, 2).map((r) => (
            <span
              key={`h-${r.orgId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground"
              title={r.orgName}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Yuqori: {shortBranchName(r.orgName)}
            </span>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-x-auto">
        <div className="min-w-[760px]">
          <div
            className="mb-2 grid items-center gap-1"
            style={{
              gridTemplateColumns: `minmax(140px, 1.1fr) repeat(${weekLabels.length}, minmax(28px, 1fr))`,
            }}
          >
            <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Filial
            </div>
            {weekLabels.map((label) => (
              <div
                key={label}
                className="text-center font-mono text-[10px] text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>

          {rows.map((row) => {
            const short = shortBranchName(row.orgName);
            const isQuiet = quietBranches.some((q) => q.orgId === row.orgId);
            const isHot = hotBranches.some((h) => h.orgId === row.orgId);
            return (
              <div
                key={row.orgId}
                className={cn(
                  'grid items-center gap-1 border-b border-border/50 py-1.5 last:border-0',
                  isQuiet && 'bg-amber-500/[0.04]',
                  isHot && !isQuiet && 'bg-accent/40',
                )}
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
                  <div className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {row.totalLogins.toLocaleString()} · 12h
                    {isQuiet ? ' · past' : isHot ? ' · yuqori' : ''}
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
    </div>
  );
}
