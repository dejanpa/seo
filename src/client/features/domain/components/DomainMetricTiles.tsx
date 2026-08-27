import type { DomainOverviewMetrics } from "@/client/features/domain/types";
import { formatRounded, formatUsd } from "@/client/features/domain/utils";

function Tile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4">
      <p className="text-xs uppercase tracking-wide text-base-content/60">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${accent ? "text-primary" : ""}`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-base-content/50">{hint}</p>
      ) : null}
    </div>
  );
}

/** Ahrefs-style headline numbers, all from the one domain_rank_overview call. */
export function DomainMetricTiles({
  overview,
  hint,
}: {
  overview: DomainOverviewMetrics;
  hint?: string;
}) {
  const value = (input: number | null | undefined) =>
    overview.hasData && input != null ? formatRounded(input) : "—";

  const top3 = overview.positions?.top3;
  const keywords = overview.organicKeywords;
  const top3Share =
    top3 != null && keywords != null && keywords > 0
      ? `${Math.round((top3 / keywords) * 100)}% of keywords`
      : undefined;

  const hasPaid =
    (overview.paidKeywords ?? 0) > 0 || (overview.paidTraffic ?? 0) > 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        label="Organic traffic"
        value={value(overview.organicTraffic)}
        hint={hint ?? "Estimated visits per month"}
        accent
      />
      <Tile
        label="Organic keywords"
        value={value(overview.organicKeywords)}
        hint={hint ?? "Keywords ranking in the top 100"}
      />
      <Tile
        label="Traffic value"
        value={
          overview.hasData && overview.trafficValue != null
            ? formatUsd(overview.trafficValue)
            : "—"
        }
        hint="Monthly ad spend to buy this traffic"
      />
      <Tile
        label="Top 3 positions"
        value={value(top3)}
        hint={top3Share ?? "Keywords ranking #1-#3"}
      />
      {hasPaid ? (
        <>
          <Tile
            label="Paid keywords"
            value={value(overview.paidKeywords)}
            hint="Keywords the domain also buys ads for"
          />
          <Tile
            label="Paid traffic"
            value={value(overview.paidTraffic)}
            hint="Estimated ad visits per month"
          />
        </>
      ) : null}
    </div>
  );
}
