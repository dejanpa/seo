import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { History } from "lucide-react";
import { useChartWidth } from "@/client/hooks/useChartWidth";
import type { KeywordHistoryPoint } from "@/types/keywords";
import type { LazyKeywordPanel } from "../hooks/useLazyKeywordPanel";
import { formatCompactNumber } from "../utils";
import { LazyPanelCard } from "./LazyPanelCard";

type HistoryData = { history: KeywordHistoryPoint[] };

/**
 * How the keyword got here.
 *
 * Monthly volume is already in the table, so the reason this panel exists is
 * the second axis: CPC over the same months says whether the commercial
 * pressure on the term is building, which volume alone cannot.
 */
export function KeywordHistoryCard({
  panel,
  keyword,
}: {
  panel: LazyKeywordPanel<HistoryData>;
  keyword: string | null;
}) {
  return (
    <LazyPanelCard
      icon={History}
      title="Volume and CPC history"
      keyword={keyword}
      panel={panel}
      closedHint="How volume, CPC and competition moved month by month. Opening this runs one lookup for this keyword."
      openHint="Search volume on the left axis, CPC on the right. Competition is in the tooltip."
      emptyLabel="No month-by-month history for this keyword."
    >
      {(data) =>
        data.history.length < 2 ? null : <HistoryChart points={data.history} />
      }
    </LazyPanelCard>
  );
}

const MONTH_LABEL = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

type ChartPoint = KeywordHistoryPoint & { label: string };

function HistoryChart({ points }: { points: KeywordHistoryPoint[] }) {
  const { containerRef, width } = useChartWidth();
  const data: ChartPoint[] = points.map((point) => ({
    ...point,
    label: MONTH_LABEL.format(Date.UTC(point.year, point.month - 1, 1)),
  }));

  return (
    <div ref={containerRef} className="mt-3 h-44 min-w-0">
      {width > 0 ? (
        <LineChart
          width={width}
          height={176}
          data={data}
          margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            stroke="var(--trend-grid-color)"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            interval="preserveStartEnd"
            minTickGap={40}
            tick={{ fill: "var(--trend-axis-color)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="volume"
            tickFormatter={(value: number) => formatCompactNumber(value)}
            tick={{ fill: "var(--trend-axis-color)", fontSize: 11 }}
            width={42}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="cpc"
            orientation="right"
            tickFormatter={(value: number) => `$${value.toFixed(0)}`}
            tick={{ fill: "var(--trend-axis-color)", fontSize: 11 }}
            width={36}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<HistoryTooltip />} />
          <Line
            yAxisId="volume"
            type="monotone"
            dataKey="searchVolume"
            name="Search volume"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="cpc"
            type="monotone"
            dataKey="cpc"
            name="CPC"
            stroke="var(--color-warning)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      ) : null}
    </div>
  );
}

function HistoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-base-300 bg-base-100 px-3 py-2 shadow-sm">
      <p className="text-xs text-base-content/60">{point.label}</p>
      <p className="text-sm font-medium tabular-nums">
        {point.searchVolume === null
          ? "-"
          : `${formatCompactNumber(point.searchVolume)} searches`}
      </p>
      <p className="text-xs tabular-nums text-base-content/70">
        {point.cpc === null ? "no CPC" : `$${point.cpc.toFixed(2)} CPC`}
        {point.competition === null
          ? ""
          : ` · competition ${point.competition.toFixed(2)}`}
      </p>
    </div>
  );
}
