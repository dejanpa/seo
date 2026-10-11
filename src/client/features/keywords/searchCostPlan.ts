import { getKeywordDataProvider } from "@/shared/keyword-locations";
import type { KeywordMode } from "./keywordResearchTypes";

/**
 * What a search will actually run, before it runs.
 *
 * Deliberately a count of lookups rather than a price. DataForSEO publishes no
 * price endpoint, and the app charges from the cost each task reports back, so
 * a hard-coded price table would drift silently and quote a number the invoice
 * then contradicts. The number of lookups is knowable exactly, and it is the
 * thing the reader can act on.
 *
 * Mirrors the server: research.ts routes Google-Ads markets to a single ideas
 * call; Labs "auto" runs suggestions and ideas together and adds related only
 * when they come back thin; any other mode runs one source; a local search adds
 * one Google Ads volume call. See backfill.ts for the fill-in calls and
 * useKeywordSerpAnalysis for the SERP one.
 */
type SearchCostPlan = {
  minLookups: number;
  maxLookups: number;
  summary: string;
};

export function describeSearchCost(input: {
  mode: KeywordMode;
  locationCode: number;
  locationName?: string;
  clickstream: boolean;
}): SearchCostPlan {
  const isGoogleAds = getKeywordDataProvider(input.locationCode) !== "labs";
  const blended = !isGoogleAds && input.mode === "auto";

  // Google Ads markets get one ideas call and no source fallback; Labs "auto"
  // always blends two sources and falls back to a third only when they are
  // thin. A local search buys one more call for the area's volumes.
  const localLookups = input.locationName ? 1 : 0;
  const minKeywordLookups = (blended ? 2 : 1) + localLookups;
  const maxKeywordLookups = (blended ? 3 : 1) + localLookups;

  // Intent is filled in when the market's language supports it; difficulty
  // only on Labs markets. Both are skipped when nothing is missing.
  const maxBackfill = isGoogleAds ? 1 : 2;
  // The SERP panel opens with the results, so it always runs.
  const serpLookups = 1;

  const minLookups = minKeywordLookups + serpLookups;
  const maxLookups = maxKeywordLookups + maxBackfill + serpLookups;

  const range =
    minLookups === maxLookups
      ? `${minLookups} lookups`
      : `${minLookups}-${maxLookups} lookups`;

  return {
    minLookups,
    maxLookups,
    // Google Ads markets and local searches ignore the clickstream option.
    summary:
      input.clickstream && !isGoogleAds && !input.locationName
        ? `Runs ${range}, and clickstream doubles the keyword ones.`
        : `Runs ${range}.`,
  };
}
