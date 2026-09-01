import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { useChartWidth } from "@/client/hooks/useChartWidth";
import type { KeywordIntent } from "@/types/keywords";
import type {
  DifficultyBand,
  KeywordAnalytics,
  MonthPoint,
  ScatterPoint,
} from "../keywordAnalytics";
import { formatCompactNumber, formatNumber } from "../utils";
import { INTENT_LABELS } from "./IntentBadge";
import {
  AXIS_TICK,
  DIFFICULTY_FILL,
  EmptyPanel,
  INTENT_FILL,
  IntentLegend,
  Legend,
  Panel,
  SliceTooltip,
  TooltipShell,
} from "./keywordPanelChrome";

/**
 * The dashboard panels that need a real plotting engine.
 *
 * Everything drawable with a div — the tiles and the ranked bars — already is,
 * so the chart components stay together in this one lazily loaded module.
 *
 * A panel with nothing to say is omitted rather than drawn empty. Not every
 * source carries every field: Google-Ads-served markets return no difficulty
 * at all, and a domain's ranked keywords carry no intent, so an intent donut
 * reading "100% unknown" would be a worse answer than no donut.
 */
export default function KeywordDashboardCharts({
  analytics,
}: {
  analytics: KeywordAnalytics;
}) {
  const hasIntent = analytics.intentSplit.some(
    (slice) => slice.intent !== "unknown",
  );

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {analytics.monthly.length >= 2 ? (
        <DemandPanel
          monthly={analytics.monthly}
          partialMonths={analytics.partialMonths}
        />
      ) : null}
      {analytics.scatter.length > 0 ? (
        <OpportunityPanel scatter={analytics.scatter} />
      ) : null}
      {hasIntent ? (
        <IntentPanel split={analytics.intentSplit} count={analytics.count} />
      ) : null}
      {analytics.difficultyBands.length > 0 ? (
        <DifficultyPanel bands={analytics.difficultyBands} />
      ) : null}
    </div>
  );
}

/** Total monthly searches across every keyword in the set — the chart behind
 * the MoM/QoQ/YoY figures in the tiles. */
function DemandPanel({
  monthly,
  partialMonths,
}: {
  monthly: MonthPoint[];
  partialMonths: number;
}) {
  const { containerRef, width } = useChartWidth();

  return (
    <Panel
      title="Search demand over time"
      subtitle={
        partialMonths > 0
          ? `${partialMonths} month${partialMonths === 1 ? "" : "s"} hidden — too few keywords reported them`
          : "Summed across every keyword in this set"
      }
    >
      {monthly.length < 2 ? (
        <EmptyPanel label="No shared monthly history in these results." />
      ) : (
        <div ref={containerRef} className="h-52 min-w-0">
          {width > 0 ? (
            <AreaChart
              width={width}
              height={208}
              data={monthly}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-primary)"
                    stopOpacity="var(--trend-fill-start-opacity)"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-primary)"
                    stopOpacity="var(--trend-fill-end-opacity)"
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="var(--trend-grid-color)"
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                // A long series would print every label on top of the next.
                interval="preserveStartEnd"
                minTickGap={28}
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value: number) => formatCompactNumber(value)}
                tick={AXIS_TICK}
                width={46}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<DemandTooltip />} />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#demandGrad)"
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

function DemandTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: MonthPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <TooltipShell>
      <p className="text-xs text-base-content/60">{point.label}</p>
      <p className="text-sm font-medium tabular-nums">
        {formatNumber(point.volume)} searches
        <span className="text-base-content/60">
          {" "}
          · {point.coverage} keywords
        </span>
      </p>
    </TooltipShell>
  );
}

/** Volume against difficulty: the top-left corner is where the work is worth
 * doing. */
function OpportunityPanel({ scatter }: { scatter: ScatterPoint[] }) {
  const { containerRef, width } = useChartWidth();
  const byIntent = new Map<KeywordIntent, ScatterPoint[]>();
  for (const point of scatter) {
    byIntent.set(point.intent, [...(byIntent.get(point.intent) ?? []), point]);
  }

  return (
    <Panel
      title="Opportunity map"
      subtitle="Volume against difficulty. Dot size is CPC, color is intent."
    >
      {scatter.length === 0 ? (
        <EmptyPanel label="No keyword carries both a volume and a difficulty." />
      ) : (
        <div ref={containerRef} className="h-52 min-w-0">
          {width > 0 ? (
            <ScatterChart
              width={width}
              height={208}
              margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                stroke="var(--trend-grid-color)"
                strokeDasharray="2 4"
              />
              <XAxis
                type="number"
                dataKey="difficulty"
                name="Difficulty"
                domain={[0, 100]}
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="volume"
                name="Volume"
                // Volume spans orders of magnitude; a linear axis collapses
                // every long-tail term onto the baseline.
                scale="log"
                domain={["auto", "auto"]}
                tickFormatter={(value: number) => formatCompactNumber(value)}
                tick={AXIS_TICK}
                width={46}
                axisLine={false}
                tickLine={false}
              />
              <ZAxis type="number" dataKey="cpc" range={[24, 260]} name="CPC" />
              <Tooltip
                content={<OpportunityTooltip />}
                cursor={{ strokeDasharray: "3 3" }}
              />
              {[...byIntent.entries()].map(([intent, points]) => (
                <Scatter
                  key={intent}
                  data={points}
                  fill={INTENT_FILL[intent]}
                  fillOpacity={intent === "unknown" ? 0.25 : 0.55}
                  isAnimationActive={false}
                />
              ))}
            </ScatterChart>
          ) : null}
        </div>
      )}
      <IntentLegend intents={[...byIntent.keys()]} />
    </Panel>
  );
}

function OpportunityTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ScatterPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <TooltipShell>
      <p className="max-w-56 truncate text-sm font-medium">{point.keyword}</p>
      <p className="text-xs tabular-nums text-base-content/70">
        {formatNumber(point.volume)} vol · KD {Math.round(point.difficulty)} · $
        {point.cpc.toFixed(2)} CPC
      </p>
      <p className="text-xs text-base-content/60">
        {INTENT_LABELS[point.intent]}
      </p>
    </TooltipShell>
  );
}

function IntentPanel({
  split,
  count,
}: {
  split: KeywordAnalytics["intentSplit"];
  count: number;
}) {
  const { containerRef, width } = useChartWidth();

  return (
    <Panel title="Search intent" subtitle={`${count} keywords`}>
      <div ref={containerRef} className="h-52 min-w-0">
        {width > 0 ? (
          <PieChart width={width} height={208}>
            <Pie
              data={split}
              dataKey="value"
              nameKey="intent"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={78}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {split.map((slice) => (
                <Cell
                  key={slice.intent}
                  fill={INTENT_FILL[slice.intent]}
                  fillOpacity={slice.intent === "unknown" ? 0.25 : 0.75}
                  stroke="var(--color-base-100)"
                />
              ))}
            </Pie>
            <Tooltip
              content={<SliceTooltip total={count} labels={INTENT_LABELS} />}
            />
          </PieChart>
        ) : null}
      </div>
      <IntentLegend intents={split.map((slice) => slice.intent)} />
    </Panel>
  );
}

function DifficultyPanel({ bands }: { bands: DifficultyBand[] }) {
  const { containerRef, width } = useChartWidth();
  const total = bands.reduce((sum, band) => sum + band.value, 0);

  if (total === 0) {
    return (
      <Panel title="Difficulty spread" subtitle="No difficulty scores">
        <EmptyPanel label="None of these keywords carries a difficulty score." />
      </Panel>
    );
  }

  return (
    <Panel
      title="Difficulty spread"
      subtitle={`${total} keywords carry a difficulty score`}
    >
      <div ref={containerRef} className="h-52 min-w-0">
        {width > 0 ? (
          <PieChart width={width} height={208}>
            <Pie
              data={bands}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={78}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {bands.map((band) => (
                <Cell
                  key={band.name}
                  fill={DIFFICULTY_FILL[band.name]}
                  fillOpacity={0.75}
                  stroke="var(--color-base-100)"
                />
              ))}
            </Pie>
            <Tooltip content={<SliceTooltip total={total} labels={{}} />} />
          </PieChart>
        ) : null}
      </div>
      <Legend
        entries={bands.map((band) => ({
          color: DIFFICULTY_FILL[band.name],
          label: band.name,
        }))}
      />
    </Panel>
  );
}
