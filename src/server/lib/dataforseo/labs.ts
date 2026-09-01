import { z } from "zod";
import {
  DataforseoLabsGoogleBulkKeywordDifficultyLiveRequestInfo,
  DataforseoLabsGoogleDomainRankOverviewLiveRequestInfo,
  DataforseoLabsGoogleHistoricalKeywordDataLiveRequestInfo,
  DataforseoLabsGoogleKeywordIdeasLiveRequestInfo,
  DataforseoLabsGoogleKeywordOverviewLiveRequestInfo,
  DataforseoLabsGoogleKeywordSuggestionsLiveRequestInfo,
  DataforseoLabsGoogleRankedKeywordsLiveRequestInfo,
  DataforseoLabsGoogleRelatedKeywordsLiveRequestInfo,
  DataforseoLabsGoogleRelevantPagesLiveRequestInfo,
  DataforseoLabsGoogleSearchIntentLiveRequestInfo,
  DataforseoLabsGoogleSerpCompetitorsLiveRequestInfo,
  type DataforseoLabsBulkKeywordDifficultyLiveItem,
  type DataforseoLabsDomainRankOverviewLiveItem,
  type DataforseoLabsGoogleSearchIntentLiveItem,
  type DataforseoLabsGoogleKeywordOverviewLiveItem,
  type DataforseoLabsRelatedKeywordsLiveItem,
  type DataforseoLabsRelevantPagesLiveItem,
  type DataforseoLabsSerpCompetitorsLiveItem,
  type KeywordDataInfo,
} from "dataforseo-client";
import { labsApi } from "@/server/lib/dataforseo/core";
import type { KeywordHistoryPoint } from "@/types/keywords";
import {
  assertOk,
  buildTaskBilling,
  parseTaskItems,
  type DataforseoApiResponse,
} from "@/server/lib/dataforseo/envelope";

// SDK item models are 1:1 supersets of what we need, so we expose them directly
// under the names the rest of the app already uses (no hand-written Zod).
export type LabsKeywordDataItem = KeywordDataInfo;
type RelatedKeywordItem = DataforseoLabsRelatedKeywordsLiveItem;
type DomainMetricsItem = DataforseoLabsDomainRankOverviewLiveItem;
export type RelevantPagesItem = DataforseoLabsRelevantPagesLiveItem;
export type KeywordOverviewItem = DataforseoLabsGoogleKeywordOverviewLiveItem;
type SerpCompetitorItem = DataforseoLabsSerpCompetitorsLiveItem;

// Ranked keywords is the one Labs endpoint the SDK types loosely: its
// `ranked_serp_element.serp_item` is the base element item, so the url / etv /
// rank fields we read are untyped (`any`). Keep a focused schema so the
// domain-keyword mapper stays type-safe.
const rankedSerpItemSchema = z
  .object({
    url: z.string().nullable().optional(),
    relative_url: z.string().nullable().optional(),
    rank_absolute: z.number().nullable().optional(),
    etv: z.number().nullable().optional(),
  })
  .passthrough();

const domainRankedKeywordItemSchema = z
  .object({
    keyword_data: z
      .object({
        keyword: z.string().nullable().optional(),
        keyword_info: z
          .object({
            search_volume: z.number().nullable().optional(),
            cpc: z.number().nullable().optional(),
            keyword_difficulty: z.number().nullable().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
        keyword_properties: z
          .object({
            keyword_difficulty: z.number().nullable().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    ranked_serp_element: z
      .object({
        serp_item: rankedSerpItemSchema.nullable().optional(),
        url: z.string().nullable().optional(),
        relative_url: z.string().nullable().optional(),
        rank_absolute: z.number().nullable().optional(),
        etv: z.number().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    keyword: z.string().nullable().optional(),
  })
  .passthrough();

export type DomainRankedKeywordItem = z.infer<
  typeof domainRankedKeywordItemSchema
>;

type DataforseoLabsItemType =
  | "organic"
  | "paid"
  | "featured_snippet"
  | "local_pack"
  | "ai_overview_reference";

export async function fetchRelatedKeywords(input: {
  keyword: string;
  locationCode: number;
  languageCode: string;
  limit: number;
  depth?: number;
  includeClickstreamData?: boolean;
}): Promise<DataforseoApiResponse<RelatedKeywordItem[]>> {
  const response = await labsApi().googleRelatedKeywordsLive([
    new DataforseoLabsGoogleRelatedKeywordsLiveRequestInfo({
      keyword: input.keyword,
      location_code: input.locationCode,
      language_code: input.languageCode,
      limit: input.limit,
      depth: input.depth ?? 3,
      // Clickstream-refined volumes DOUBLE the request cost, so they are
      // opt-in — see specs/0004-keyword-data-source-routing.md.
      include_clickstream_data: input.includeClickstreamData ?? false,
      include_serp_info: false,
    }),
  ]);
  const task = assertOk(response);
  return {
    data: task.result?.[0]?.items ?? [],
    billing: buildTaskBilling(task),
  };
}

export async function fetchKeywordSuggestions(input: {
  keyword: string;
  locationCode: number;
  languageCode: string;
  limit: number;
  includeClickstreamData?: boolean;
}): Promise<DataforseoApiResponse<LabsKeywordDataItem[]>> {
  const response = await labsApi().googleKeywordSuggestionsLive([
    new DataforseoLabsGoogleKeywordSuggestionsLiveRequestInfo({
      keyword: input.keyword,
      location_code: input.locationCode,
      language_code: input.languageCode,
      limit: input.limit,
      include_clickstream_data: input.includeClickstreamData ?? false,
      include_serp_info: false,
      include_seed_keyword: true,
      ignore_synonyms: false,
      exact_match: false,
    }),
  ]);
  const task = assertOk(response);
  return {
    data: task.result?.[0]?.items ?? [],
    billing: buildTaskBilling(task),
  };
}

export async function fetchKeywordIdeas(input: {
  keyword: string;
  locationCode: number;
  languageCode: string;
  limit: number;
  includeClickstreamData?: boolean;
}): Promise<DataforseoApiResponse<LabsKeywordDataItem[]>> {
  const response = await labsApi().googleKeywordIdeasLive([
    new DataforseoLabsGoogleKeywordIdeasLiveRequestInfo({
      keywords: [input.keyword],
      location_code: input.locationCode,
      language_code: input.languageCode,
      limit: input.limit,
      include_clickstream_data: input.includeClickstreamData ?? false,
      include_serp_info: false,
      ignore_synonyms: false,
      closely_variants: false,
    }),
  ]);
  const task = assertOk(response);
  return {
    data: task.result?.[0]?.items ?? [],
    billing: buildTaskBilling(task),
  };
}

export async function fetchDomainRankOverview(input: {
  target: string;
  locationCode: number;
  languageCode: string;
}): Promise<DataforseoApiResponse<DomainMetricsItem[]>> {
  const response = await labsApi().googleDomainRankOverviewLive([
    new DataforseoLabsGoogleDomainRankOverviewLiveRequestInfo({
      target: input.target,
      location_code: input.locationCode,
      language_code: input.languageCode,
      limit: 1,
    }),
  ]);
  const task = assertOk(response);
  return {
    data: task.result?.[0]?.items ?? [],
    billing: buildTaskBilling(task),
  };
}

type RankedKeywordsPage = {
  items: DomainRankedKeywordItem[];
  totalCount: number | null;
};

export async function fetchRankedKeywords(input: {
  target: string;
  locationCode: number;
  languageCode: string;
  limit: number;
  offset?: number;
  orderBy?: string[];
  filters?: unknown[];
  itemTypes?: DataforseoLabsItemType[];
}): Promise<DataforseoApiResponse<RankedKeywordsPage>> {
  // Note: ranked_keywords has no include_subdomains parameter — a domain
  // target always covers the hostname plus its subdomains. Narrower scopes
  // are expressed through `filters` (see researchScopeFilters.ts).
  const response = await labsApi().googleRankedKeywordsLive([
    new DataforseoLabsGoogleRankedKeywordsLiveRequestInfo({
      target: input.target,
      location_code: input.locationCode,
      language_code: input.languageCode,
      limit: input.limit,
      offset: input.offset,
      order_by: input.orderBy,
      filters: input.filters,
      item_types: input.itemTypes,
    }),
  ]);
  const task = assertOk(response);
  return {
    data: {
      items: parseTaskItems(
        "google-ranked-keywords-live",
        task,
        domainRankedKeywordItemSchema,
      ),
      totalCount: task.result?.[0]?.total_count ?? null,
    },
    billing: buildTaskBilling(task),
  };
}

type RelevantPagesPage = {
  items: RelevantPagesItem[];
  totalCount: number | null;
};

export async function fetchRelevantPages(input: {
  target: string;
  locationCode: number;
  languageCode: string;
  limit: number;
  offset?: number;
  orderBy?: string[];
  filters?: unknown[];
}): Promise<DataforseoApiResponse<RelevantPagesPage>> {
  const response = await labsApi().googleRelevantPagesLive([
    new DataforseoLabsGoogleRelevantPagesLiveRequestInfo({
      target: input.target,
      location_code: input.locationCode,
      language_code: input.languageCode,
      limit: input.limit,
      offset: input.offset,
      order_by: input.orderBy,
      filters: input.filters,
    }),
  ]);
  const task = assertOk(response);
  return {
    data: {
      items: task.result?.[0]?.items ?? [],
      totalCount: task.result?.[0]?.total_count ?? null,
    },
    billing: buildTaskBilling(task),
  };
}

export async function fetchKeywordOverview(input: {
  keywords: string[];
  locationCode: number;
  languageCode: string;
  includeClickstreamData?: boolean;
}): Promise<DataforseoApiResponse<KeywordOverviewItem[]>> {
  const response = await labsApi().googleKeywordOverviewLive([
    new DataforseoLabsGoogleKeywordOverviewLiveRequestInfo({
      keywords: input.keywords,
      location_code: input.locationCode,
      language_code: input.languageCode,
      include_clickstream_data: input.includeClickstreamData ?? false,
    }),
  ]);
  const task = assertOk(response);
  return {
    data: task.result?.[0]?.items ?? [],
    billing: buildTaskBilling(task),
  };
}

type SearchIntentItem = DataforseoLabsGoogleSearchIntentLiveItem;
type BulkKeywordDifficultyItem = DataforseoLabsBulkKeywordDifficultyLiveItem;

/**
 * Search intent for keywords the expansion endpoints left unlabelled.
 *
 * Language-only: this endpoint takes no location, which is why it can label
 * keywords for the Google-Ads-served countries Labs does not cover at all.
 * Callers must check the language against SEARCH_INTENT_LANGUAGES first — an
 * unsupported one comes back as a *charged* "Invalid Field: 'language_code'".
 */
export async function fetchSearchIntent(input: {
  keywords: string[];
  languageCode: string;
}): Promise<DataforseoApiResponse<SearchIntentItem[]>> {
  const response = await labsApi().googleSearchIntentLive([
    new DataforseoLabsGoogleSearchIntentLiveRequestInfo({
      keywords: input.keywords,
      language_code: input.languageCode,
    }),
  ]);
  const task = assertOk(response);
  return {
    data: task.result?.[0]?.items ?? [],
    billing: buildTaskBilling(task),
  };
}

/** Difficulty for keywords the expansion endpoints returned without one. */
export async function fetchBulkKeywordDifficulty(input: {
  keywords: string[];
  locationCode: number;
  languageCode: string;
}): Promise<DataforseoApiResponse<BulkKeywordDifficultyItem[]>> {
  const response = await labsApi().googleBulkKeywordDifficultyLive([
    new DataforseoLabsGoogleBulkKeywordDifficultyLiveRequestInfo({
      keywords: input.keywords,
      location_code: input.locationCode,
      language_code: input.languageCode,
    }),
  ]);
  const task = assertOk(response);
  return {
    data: task.result?.[0]?.items ?? [],
    billing: buildTaskBilling(task),
  };
}

/**
 * How volume, CPC and competition looked in previous months.
 *
 * The research rows already carry monthly volume, so the reason to buy this is
 * the other two series: CPC and competition say whether the commercial
 * pressure on a term is building, which volume alone cannot.
 */
export async function fetchHistoricalKeywordData(input: {
  keyword: string;
  locationCode: number;
  languageCode: string;
}): Promise<DataforseoApiResponse<KeywordHistoryPoint[]>> {
  const response = await labsApi().googleHistoricalKeywordDataLive([
    new DataforseoLabsGoogleHistoricalKeywordDataLiveRequestInfo({
      keywords: [input.keyword],
      location_code: input.locationCode,
      language_code: input.languageCode,
    }),
  ]);
  const task = assertOk(response);

  const history = task.result?.[0]?.items?.[0]?.history ?? [];
  return {
    data: history
      .flatMap((entry) => {
        if (entry.year == null || entry.month == null) return [];
        return [
          {
            year: entry.year,
            month: entry.month,
            searchVolume: entry.keyword_info?.search_volume ?? null,
            cpc: entry.keyword_info?.cpc ?? null,
            competition: entry.keyword_info?.competition ?? null,
          },
        ];
      })
      .toSorted((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month)),
    billing: buildTaskBilling(task),
  };
}

export async function fetchSerpCompetitors(input: {
  keywords: string[];
  locationCode: number;
  languageCode: string;
  itemTypes?: DataforseoLabsItemType[];
  includeSubdomains?: boolean;
  limit: number;
  offset?: number;
}): Promise<DataforseoApiResponse<SerpCompetitorItem[]>> {
  const response = await labsApi().googleSerpCompetitorsLive([
    new DataforseoLabsGoogleSerpCompetitorsLiveRequestInfo({
      keywords: input.keywords,
      location_code: input.locationCode,
      language_code: input.languageCode,
      item_types: input.itemTypes,
      include_subdomains: input.includeSubdomains,
      limit: input.limit,
      offset: input.offset,
    }),
  ]);
  const task = assertOk(response);
  return {
    data: task.result?.[0]?.items ?? [],
    billing: buildTaskBilling(task),
  };
}
