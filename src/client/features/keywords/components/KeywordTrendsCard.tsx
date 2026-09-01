import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { useChartWidth } from "@/client/hooks/useChartWidth";
import type { GoogleTrendsData, TrendsRelatedQuery } from "@/types/keywords";
import type { LazyKeywordPanel } from "../hooks/useLazyKeywordPanel";
import { LazyPanelCard } from "./LazyPanelCard";

/**
 * Google Trends for the focused keyword.
 *
 * Relative interest answers a different question from the volume chart above
 * it: attention rather than counts, over five years rather than twelve months,
 * which is where seasonality shows up.
 */
export function KeywordTrendsCard({
  panel,
  keyword,
}: {
  panel: LazyKeywordPanel<GoogleTrendsData>;
  keyword: string | null;
}) {
  return (
    <LazyPanelCard
      icon={TrendingUp}
      title="Interest over time"
      keyword={keyword}
      panel={panel}
      closedHint="Google Trends: five years of relative interest, plus rising queries. Opening this runs one lookup for this keyword."
      openHint="Relative interest, 0 to 100, over the last five years. Attention, not search counts."
      emptyLabel="Google Trends has no interest data for this keyword."
    >
      {(trends) =>
        trends.interest.length < 2 ? null : (
          <>
            <InterestChart points={trends.interest} />
            <QueryChips label="Top queries" queries={trends.topQueries} />
            <QueryChips label="Rising queries" queries={trends.risingQueries} />
          </>
        )
      }
    </LazyPanelCard>
  );
}

const AXIS_LABEL = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

function InterestChart({ points }: { points: GoogleTrendsData["interest"] }) {
  const { containerRef, width } = useChartWidth();

  return (
    <div ref={containerRef} className="mt-3 h-44 min-w-0">
      {width > 0 ? (
        <LineChart
          width={width}
          height={176}
          data={points}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            stroke="var(--trend-grid-color)"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatAxisDate}
            // A weekly five-year series is ~260 points; every label would
            // print on top of the next.
            interval="preserveStartEnd"
            minTickGap={48}
            tick={{ fill: "var(--trend-axis-color)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "var(--trend-axis-color)", fontSize: 11 }}
            width={32}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<InterestTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      ) : null}
    </div>
  );
}

function formatAxisDate(value: string): string {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? value : AXIS_LABEL.format(parsed);
}

function InterestTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { date: string; value: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-base-300 bg-base-100 px-3 py-2 shadow-sm">
      <p className="text-xs text-base-content/60">
        {formatAxisDate(point.date)}
      </p>
      <p className="text-sm font-medium tabular-nums">{point.value} / 100</p>
    </div>
  );
}

function QueryChips({
  label,
  queries,
}: {
  label: string;
  queries: TrendsRelatedQuery[];
}) {
  if (queries.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-base-content/60">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {queries.slice(0, 10).map((entry) => (
          <span
            key={entry.query}
            className="inline-flex items-center gap-1.5 rounded-full border border-base-300 bg-base-200/60 px-2 py-0.5 text-xs"
          >
            {entry.query}
            <span className="tabular-nums text-base-content/50">
              {entry.value}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
