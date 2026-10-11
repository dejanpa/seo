// SDK-free: imported by client.ts in the eager graph, so it must not import
// the section fetchers or dataforseo-client (see sections.ts).
import { costPerSerpAtDepth } from "@/shared/rank-tracking";

/**
 * Raw DataForSEO USD upper bounds, one per metered client entry. The metering
 * seam holds credits for the estimate before the call and settles on the cost
 * DataForSEO reports, so every estimate must be >= what DataForSEO actually
 * charges for that input. Overestimating only refuses a call slightly early at
 * the tail of a balance; underestimating lets spend past the balance, and is
 * logged at settle time so the number here can be corrected.
 *
 * Shared prices are ported from upstream open-seo (src/server/lib/dataforseo/
 * pricing.ts, Sep 2026). Entries upstream doesn't have (Trends, demography,
 * autocomplete, history, search intent, bulk KD) are deliberately generous
 * bounds until real billed costs calibrate them.
 */

// DataForSEO Labs: per task + per returned row, doubled with clickstream data.
const LABS_TASK_USD = 0.012;
const LABS_ROW_USD = 0.00012;

// Keywords Data Google Ads, live mode.
export const GOOGLE_ADS_LIVE_TASK_USD = 0.09;

// Backlinks API, uniform across endpoints.
const BACKLINKS_TASK_USD = 0.024;
const BACKLINKS_ROW_USD = 0.000036;
const BACKLINKS_DEFAULT_LIMIT = 100;

// Business Data. Task posts run at high priority, double the standard rates.
const BUSINESS_LISTINGS_TASK_USD = 0.012;
const BUSINESS_LISTINGS_ROW_USD = 0.00036;
export const MY_BUSINESS_INFO_LIVE_USD = 0.0054;
const QUESTIONS_ANSWERS_PER_20_USD = 0.0054;
const REVIEWS_PRIORITY_TASK_USD = 0.001;
const REVIEWS_PRIORITY_PER_10_USD = 0.0015;
const EXTENDED_REVIEWS_PRIORITY_PER_20_USD = 0.01;
const UPDATES_PRIORITY_TASK_USD = 0.003;
const UPDATES_PRIORITY_PER_10_USD = 0.0015;

// OnPage Lighthouse, live.
export const LIGHTHOUSE_LIVE_USD = 0.005;

// AI Optimization LLM mentions: $0.1 per request + $0.001 per row.
const LLM_MENTIONS_TASK_USD = 0.1;
const LLM_MENTIONS_ROW_USD = 0.001;
export const LLM_MENTIONS_ONE_ROW_USD =
  LLM_MENTIONS_TASK_USD + LLM_MENTIONS_ROW_USD;

// Token-priced live LLM responses at the 4096-token output cap, padded.
const LLM_RESPONSE_USD = {
  chat_gpt: { webSearch: 0.09, noSearch: 0.05 },
  claude: { webSearch: 0.18, noSearch: 0.08 },
  gemini: { webSearch: 0.11, noSearch: 0.05 },
  perplexity: { webSearch: 0.04, noSearch: 0.04 },
} as const;

// SERP Google Maps and Local Finder, live: per page of 10.
const LOCAL_SERP_PAGE_USD = 0.002;

// Not in upstream's table: generous bounds, see the header comment.
export const GOOGLE_TRENDS_LIVE_USD = 0.02;
export const AUTOCOMPLETE_LIVE_USD = 0.006;

const SERP_OPERATOR_KEYWORD =
  /(allinanchor|allintext|allintitle|allinurl|cache|define|definition|filetype|id|inanchor|info|intext|intitle|inurl|link|site):/i;

export function labsUsd(rows: number, clickstream?: boolean) {
  return (LABS_TASK_USD + rows * LABS_ROW_USD) * (clickstream ? 2 : 1);
}

export function backlinksUsd(rows = BACKLINKS_DEFAULT_LIMIT) {
  return BACKLINKS_TASK_USD + rows * BACKLINKS_ROW_USD;
}

export function backlinksHistoryUsd(dateFrom: string, dateTo: string) {
  const ms = new Date(dateTo).getTime() - new Date(dateFrom).getTime();
  return backlinksUsd(Math.max(1, Math.floor(ms / 86_400_000) + 1));
}

/**
 * SERP endpoints bill per page of 10 (a partial page is a full page), and
 * DataForSEO charges 5x for keywords that use search operators.
 */
export function serpUsd(
  depth: number,
  method: "live" | "queued",
  keyword: string,
) {
  const pagedDepth = Math.ceil(Math.min(100, Math.max(10, depth)) / 10) * 10;
  return (
    costPerSerpAtDepth(pagedDepth, method) *
    (SERP_OPERATOR_KEYWORD.test(keyword) ? 5 : 1)
  );
}

export function localSerpUsd(
  searchType: "maps" | "local_finder",
  depth: number,
) {
  return searchType === "maps"
    ? LOCAL_SERP_PAGE_USD
    : Math.ceil(depth / 10) * LOCAL_SERP_PAGE_USD;
}

export function businessListingsUsd(limit: number) {
  return BUSINESS_LISTINGS_TASK_USD + limit * BUSINESS_LISTINGS_ROW_USD;
}

export function questionsAnswersUsd(depth: number) {
  return Math.ceil(depth / 20) * QUESTIONS_ANSWERS_PER_20_USD;
}

export function reviewsTaskUsd(depth: number, includeOtherSources: boolean) {
  return includeOtherSources
    ? Math.ceil(depth / 20) * EXTENDED_REVIEWS_PRIORITY_PER_20_USD
    : REVIEWS_PRIORITY_TASK_USD +
        Math.ceil(depth / 10) * REVIEWS_PRIORITY_PER_10_USD;
}

export function updatesTaskUsd(depth: number) {
  return (
    UPDATES_PRIORITY_TASK_USD +
    Math.ceil(depth / 10) * UPDATES_PRIORITY_PER_10_USD
  );
}

export function llmMentionsSearchUsd(limit = 100) {
  return (
    LLM_MENTIONS_TASK_USD +
    Math.min(1000, Math.max(1, limit)) * LLM_MENTIONS_ROW_USD
  );
}

export function llmResponseUsd(
  modelSlug: keyof typeof LLM_RESPONSE_USD,
  webSearch = true,
) {
  const price = LLM_RESPONSE_USD[modelSlug];
  return webSearch ? price.webSearch : price.noSearch;
}
