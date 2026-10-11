import { lazy, Suspense, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  computeKeywordAnalytics,
  type KeywordAnalytics,
  type KeywordAnalyticsRow,
  type RankedKeyword,
} from "../keywordAnalytics";
import { ScoreBadge } from "@/client/components/table/ScoreBadge";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Skeleton } from "@/client/components/ui/skeleton";
import { formatCompactNumber, formatNumber } from "../utils";

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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-print-hide
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
        >
          {open ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
          {label}
        </Button>
        {open && hasRows && analytics.trendCoverage > 0 ? (
          <span className="text-xs text-muted-foreground">
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
      <p className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
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
        {/* Needs a difficulty on every candidate, which Google-Ads-served
            markets never return. */}
        {analytics.easiestWins.length > 0 ? (
          <RankedPanel
            title="Easiest wins"
            subtitle="High demand for the least difficulty"
            items={analytics.easiestWins}
          />
        ) : null}
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
    <Card size="sm" className="gap-0.5 px-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </Card>
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
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h3>{title}</h3>
        </CardTitle>
        <CardDescription className="text-xs">{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Not enough data for a ranking.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {items.map((item) => (
              <li
                key={item.keyword}
                className="relative overflow-hidden rounded-md bg-muted px-2.5 py-1.5"
              >
                <div
                  aria-hidden
                  className="absolute inset-y-0 left-0 bg-primary/15"
                  style={{ width: `${item.share}%` }}
                />
                <div className="relative flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {item.keyword}
                  </span>
                  {item.difficulty === null ? null : (
                    <ScoreBadge value={Math.round(item.difficulty)} />
                  )}
                  <span className="tabular-nums text-muted-foreground">
                    {formatCompactNumber(item.volume)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {[0, 1, 2, 3].map((index) => (
        <Skeleton key={index} className="h-[292px] rounded-xl" />
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
