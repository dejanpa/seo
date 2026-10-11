import { sortBy } from "remeda";
import { z } from "zod";
import { dataforseoPost } from "@/server/lib/dataforseo/core";
import {
  assertOk,
  buildTaskBilling,
  parseTaskItems,
  type DataforseoApiResponse,
  type DataforseoItemsTask,
} from "@/server/lib/dataforseo/envelope";
import type { LabsKeywordInfo } from "@/server/lib/dataforseo/labs";
import type { KeywordHistoryPoint } from "@/types/keywords";

// Keyword endpoints only this fork calls (the keyword panels and the intent /
// difficulty backfill). Kept out of upstream's labs.ts and serp.ts so those
// files merge cleanly on the next upstream sync.

interface SearchIntentItem {
  keyword?: string | null;
  keyword_intent?: { label?: string | null; [key: string]: unknown } | null;
  [key: string]: unknown;
}

interface BulkKeywordDifficultyItem {
  keyword?: string | null;
  keyword_difficulty?: number | null;
  [key: string]: unknown;
}

interface HistoricalKeywordDataItem {
  history?: Array<{
    year?: number | null;
    month?: number | null;
    keyword_info?: LabsKeywordInfo | null;
  }> | null;
  [key: string]: unknown;
}

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
  const response = await dataforseoPost<DataforseoItemsTask<SearchIntentItem>>(
    "/v3/dataforseo_labs/google/search_intent/live",
    [{ keywords: input.keywords, language_code: input.languageCode }],
  );
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
  const response = await dataforseoPost<
    DataforseoItemsTask<BulkKeywordDifficultyItem>
  >("/v3/dataforseo_labs/google/bulk_keyword_difficulty/live", [
    {
      keywords: input.keywords,
      location_code: input.locationCode,
      language_code: input.languageCode,
    },
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
  const response = await dataforseoPost<
    DataforseoItemsTask<HistoricalKeywordDataItem>
  >("/v3/dataforseo_labs/google/historical_keyword_data/live", [
    {
      keywords: [input.keyword],
      location_code: input.locationCode,
      language_code: input.languageCode,
    },
  ]);
  const task = assertOk(response);

  const history = task.result?.[0]?.items?.[0]?.history ?? [];
  return {
    data: sortBy(
      history.flatMap((entry) => {
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
      }),
      (item) => item.year * 100 + item.month,
    ),
    billing: buildTaskBilling(task),
  };
}

type AutocompleteSuggestion = {
  suggestion: string;
  relevance: number | null;
};

const autocompleteItemSchema = z
  .object({
    suggestion: z.string().nullable().optional(),
    relevance: z.number().nullable().optional(),
  })
  .passthrough();

/**
 * What Google offers to finish the query with.
 *
 * Autocomplete is the cheapest read on live demand there is: these are
 * phrasings people are typing right now, which the Labs expansion endpoints —
 * built on an indexed corpus — can lag behind.
 */
export async function fetchAutocomplete(input: {
  keyword: string;
  locationCode: number;
  languageCode: string;
}): Promise<DataforseoApiResponse<AutocompleteSuggestion[]>> {
  const response = await dataforseoPost(
    "/v3/serp/google/autocomplete/live/advanced",
    [
      {
        keyword: input.keyword,
        location_code: input.locationCode,
        language_code: input.languageCode,
      },
    ],
  );
  const task = assertOk(response);

  const seen = new Set<string>();
  const suggestions = parseTaskItems(
    "google-autocomplete-live-advanced",
    task,
    autocompleteItemSchema,
  ).flatMap((item) => {
    // Google repeats the seed itself and, across cursor positions, the same
    // phrase more than once.
    const suggestion = item.suggestion?.trim();
    if (!suggestion || seen.has(suggestion.toLowerCase())) return [];
    seen.add(suggestion.toLowerCase());
    return [{ suggestion, relevance: item.relevance ?? null }];
  });

  return { data: suggestions, billing: buildTaskBilling(task) };
}
