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
 * call, runs the three Labs expansion sources in order for "auto" until
 * coverage is sufficient, and one source otherwise. See backfill.ts for the
 * fill-in calls and useKeywordSerpAnalysis for the SERP one.
 */
type SearchCostPlan = {
  minLookups: number;
  maxLookups: number;
  summary: string;
};

const AUTO_SOURCE_COUNT = 3;

export function describeSearchCost(input: {
  mode: KeywordMode;
  locationCode: number;
  clickstream: boolean;
}): SearchCostPlan {
  const isGoogleAds = getKeywordDataProvider(input.locationCode) !== "labs";

  // Google Ads markets get one ideas call and no source fallback; Labs "auto"
  // stops as soon as a source returns enough non-seed keywords.
  const minKeywordLookups = 1;
  const maxKeywordLookups =
    isGoogleAds || input.mode !== "auto" ? 1 : AUTO_SOURCE_COUNT;

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
    summary: input.clickstream
      ? `Runs ${range}, and clickstream doubles the keyword ones.`
      : `Runs ${range}.`,
  };
}
