import { Users } from "lucide-react";
import type { DemographySplit, KeywordAudienceData } from "@/types/keywords";
import type { LazyKeywordPanel } from "../hooks/useLazyKeywordPanel";
import { LazyPanelCard } from "./LazyPanelCard";

/**
 * Who searches this keyword and where.
 *
 * Every figure is a popularity rate relative to the strongest entry in its own
 * group, not a share of a total — bars are the honest way to draw that, and
 * they beat a chart library for five rows.
 */
export function KeywordAudienceCard({
  panel,
  keyword,
}: {
  panel: LazyKeywordPanel<KeywordAudienceData>;
  keyword: string | null;
}) {
  return (
    <LazyPanelCard
      icon={Users}
      title="Who is searching"
      keyword={keyword}
      panel={panel}
      closedHint="Regional demand plus the age and gender split. Opening this runs two lookups for this keyword."
      openHint="Popularity relative to the strongest entry in each group, over the last twelve months."
      emptyLabel="No audience data for this keyword in this market."
    >
      {(audience) => {
        const regions = audience.regions
          .slice(0, 8)
          .map((entry) => ({ label: entry.region, value: entry.value }));
        if (
          regions.length === 0 &&
          audience.age.length === 0 &&
          audience.gender.length === 0
        ) {
          return null;
        }

        return (
          <div className="mt-3 flex flex-col gap-3">
            <BarGroup label="Top regions" rows={regions} />
            <BarGroup label="Age" rows={audience.age} />
            <BarGroup label="Gender" rows={audience.gender} />
          </div>
        );
      }}
    </LazyPanelCard>
  );
}

function BarGroup({ label, rows }: { label: string; rows: DemographySplit[] }) {
  if (rows.length === 0) return null;

  // Relative to the strongest row rather than to 100, so a group whose peak is
  // 60 still fills the panel instead of looking like missing data.
  const max = Math.max(...rows.map((row) => row.value));

  return (
    <div>
      <p className="text-xs font-medium text-base-content/60">{label}</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {rows.map((row) => (
          <li
            key={row.label}
            className="relative overflow-hidden rounded-md bg-base-200/60 px-2.5 py-1"
          >
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 bg-primary/15"
              style={{ width: `${max > 0 ? (row.value / max) * 100 : 0}%` }}
            />
            <div className="relative flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate capitalize">
                {row.label}
              </span>
              <span className="tabular-nums text-base-content/70">
                {row.value}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
