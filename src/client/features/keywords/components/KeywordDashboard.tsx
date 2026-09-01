import { lazy, Suspense, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  computeKeywordAnalytics,
  type KeywordAnalytics,
  type KeywordAnalyticsRow,
  type RankedKeyword,
} from "../keywordAnalytics";
import { formatCompactNumber, formatNumber, scoreTierClass } from "../utils";

// recharts is the heaviest thing on this route and only the four chart panels
// need it, so it loads once the dashboard is actually on screen.
const KeywordDashboardCharts = lazy(() => import("./KeywordDashboardCharts"));

/**
 * What the whole result set says, above the table that says it row by row.
 *
 * Every figure here comes from the rows already on screen, so it follows the
 * table filters and costs no additional research call.
 */
export function KeywordDashboard({
  rows,
  open,
  onOpenChange,
  label = "Result overview",
  loading = false,
}: {
  rows: KeywordAnalyticsRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label?: string;
  /** Set while the caller is still fetching the rows to summarize. */
  loading?: boolean;
}) {
  const analytics = useMemo(() => computeKeywordAnalytics(rows), [rows]);
  const hasRows = rows.length > 0;

  return (
    <div className="shrink-0 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          className="btn btn-ghost btn-sm gap-1.5 px-2"
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
        >
          {open ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
          {label}
        </button>
        {open && hasRows && analytics.trendCoverage > 0 ? (
          <span className="text-xs text-base-content/55">
            {analytics.rising} rising · {analytics.falling} falling ·{" "}
            {analytics.trendCoverage} with a month-over-month direction
          </span>
        ) : null}
      </div>

      {open ? (
        <Content analytics={analytics} loading={loading} hasRows={hasRows} />
      ) : null}
    </div>
  );
}

function Content({
  analytics,
  loading,
  hasRows,
}: {
  analytics: KeywordAnalytics;
  loading: boolean;
  hasRows: boolean;
}) {
  if (loading) return <ChartsSkeleton />;

  if (!hasRows) {
    return (
      <p className="rounded-xl border border-base-300 bg-base-100 px-4 py-10 text-center text-sm text-base-content/55">
        No keywords to summarize.
      </p>
    );
  }

  return (
    <>
      <StatTiles analytics={analytics} />
      <Suspense fallback={<ChartsSkeleton />}>
        <KeywordDashboardCharts analytics={analytics} />
      </Suspense>
      <div className="grid gap-3 xl:grid-cols-2">
        <RankedPanel
          title="Highest volume"
          subtitle="Where the demand is concentrated"
          items={analytics.topByVolume}
        />
        <RankedPanel
          title="Easiest wins"
          subtitle="High demand for the least difficulty"
          items={analytics.easiestWins}
        />
      </div>
    </>
  );
}

function StatTiles({ analytics }: { analytics: KeywordAnalytics }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
      <Tile label="Keywords" value={formatNumber(analytics.count)} />
      <Tile
        label="Total volume"
        value={formatCompactNumber(analytics.totalVolume)}
      />
      <Tile
        label="Median volume"
        value={formatCompactNumber(analytics.medianVolume)}
      />
      <Tile label="Median CPC" value={formatMoney(analytics.medianCpc)} />
      <Tile label="Median KD" value={formatScore(analytics.medianDifficulty)} />
      <Tile
        label="MoM"
        value={formatPercent(analytics.aggregateTrend.monthly)}
      />
      <Tile
        label="QoQ"
        value={formatPercent(analytics.aggregateTrend.quarterly)}
      />
      <Tile
        label="YoY"
        value={formatPercent(analytics.aggregateTrend.yearly)}
      />
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-2">
      <p className="text-xs text-base-content/55">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function RankedPanel({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: RankedKeyword[];
}) {
  return (
    <section className="rounded-xl border border-base-300 bg-base-100 p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-xs text-base-content/55">{subtitle}</p>
      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-base-content/55">
          Not enough data for a ranking.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {items.map((item) => (
            <li
              key={item.keyword}
              className="relative overflow-hidden rounded-md bg-base-200/60 px-2.5 py-1.5"
            >
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 bg-primary/15"
                style={{ width: `${item.share}%` }}
              />
              <div className="relative flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{item.keyword}</span>
                {item.difficulty === null ? null : (
                  <span
                    className={`score-badge ${scoreTierClass(item.difficulty)} inline-flex h-5 items-center rounded-full px-1.5 text-[10px] font-semibold`}
                  >
                    KD {Math.round(item.difficulty)}
                  </span>
                )}
                <span className="tabular-nums text-base-content/70">
                  {formatCompactNumber(item.volume)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="h-[292px] animate-pulse rounded-xl border border-base-300 bg-base-200/50"
        />
      ))}
    </div>
  );
}

function formatMoney(value: number | null): string {
  return value === null ? "-" : `$${value.toFixed(2)}`;
}

function formatScore(value: number | null): string {
  return value === null ? "-" : String(Math.round(value));
}

/** Dashes rather than a zero when the months needed for the comparison are
 * missing — see windowChange in keywordAnalytics. */
function formatPercent(value: number | null): string {
  if (value === null) return "-";
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}%` : `${rounded}%`;
}
