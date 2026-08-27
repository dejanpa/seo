import { Bar, BarChart, Cell, LabelList, Tooltip, XAxis } from "recharts";
import { useChartWidth } from "@/client/hooks/useChartWidth";
import type { DomainPositions } from "@/client/features/domain/types";
import { formatRounded } from "@/client/features/domain/utils";

const BUCKETS = [
  { key: "top3", label: "Top 3", opacity: 1 },
  { key: "pos4to10", label: "4-10", opacity: 0.8 },
  { key: "pos11to20", label: "11-20", opacity: 0.6 },
  { key: "pos21to50", label: "21-50", opacity: 0.42 },
  { key: "pos51to100", label: "51-100", opacity: 0.28 },
] as const;

type Row = { label: string; keywords: number; share: number; opacity: number };

function PositionsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Row }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border border-base-300 bg-base-100 px-3 py-2 shadow-sm">
      <p className="text-xs text-base-content/60">Positions {row.label}</p>
      <p className="text-sm font-medium tabular-nums">
        {formatRounded(row.keywords)} keywords
        <span className="text-base-content/60"> · {row.share}%</span>
      </p>
    </div>
  );
}

/** Where the domain's keywords actually sit in the SERP — the shape of the
 * profile matters more than the total keyword count. */
export function DomainPositionsCard({
  positions,
}: {
  positions: DomainPositions;
}) {
  const { containerRef, width } = useChartWidth();
  const total = BUCKETS.reduce((sum, bucket) => sum + positions[bucket.key], 0);
  const rows: Row[] = BUCKETS.map((bucket) => ({
    label: bucket.label,
    keywords: positions[bucket.key],
    share: total > 0 ? Math.round((positions[bucket.key] / total) * 100) : 0,
    opacity: bucket.opacity,
  }));

  return (
    <section className="rounded-xl border border-base-300 bg-base-100 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">Keywords by position</h2>
        <span className="text-xs text-base-content/50">
          {formatRounded(total)} ranked keywords
        </span>
      </div>

      {total === 0 ? (
        <p className="py-10 text-center text-sm text-base-content/55">
          No ranking positions for this domain yet.
        </p>
      ) : (
        <>
          <div ref={containerRef} className="mt-3 h-44 min-w-0">
            {width > 0 ? (
              <BarChart
                width={width}
                height={176}
                data={rows}
                margin={{ top: 16, right: 0, bottom: 0, left: 0 }}
              >
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "currentColor", opacity: 0.6 }}
                />
                <Tooltip
                  content={<PositionsTooltip />}
                  cursor={{ fill: "currentColor", fillOpacity: 0.05 }}
                />
                <Bar dataKey="keywords" radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="keywords"
                    position="top"
                    fill="currentColor"
                    fontSize={11}
                  />
                  {rows.map((row) => (
                    <Cell
                      key={row.label}
                      fill="var(--color-primary)"
                      fillOpacity={row.opacity}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-base-content/55">
            {rows[0].share}% of rankings are in the top 3 — the only positions
            that pull real traffic.
          </p>
        </>
      )}
    </section>
  );
}
