import {
  type CreditFeature,
  mapDataforseoPathToCreditFeature,
} from "@/shared/billing-credit-features";
import {
  getOrCreateOrganizationCustomer,
  reserveUsageCredits,
  settleUsageCredits,
} from "@/server/billing/subscription";
import type { BillingCustomerContext } from "@/server/billing/subscription";
// Type-only namespace import: erased at compile, so the section modules (and
// the SDK they pull in) still only load through loadDataforseoSections below.
import type * as sections from "@/server/lib/dataforseo/sections";
import {
  DataforseoChargedTaskError,
  type DataforseoApiCallCost,
  type DataforseoApiResponse,
} from "@/server/lib/dataforseo/envelope";
import * as pricing from "@/server/lib/dataforseo/pricing";
import { isHostedServerAuthMode } from "@/server/lib/runtime-env";
import { AppError } from "@/server/lib/errors";

export { mapDataforseoPathToCreditFeature };

/** The section-fetcher barrel (sections.ts), as a type for `meter` pickers. */
export type DataforseoSections = typeof sections;

let sectionsPromise: Promise<DataforseoSections> | undefined;

/** Single lazy boundary for the DataForSEO subtree: the section fetchers and
 * the ~3 MB dataforseo-client SDK they statically import stay out of the
 * eager isolate startup graph and load once, on the first API call. */
export function loadDataforseoSections(): Promise<DataforseoSections> {
  return (sectionsPromise ??= import("@/server/lib/dataforseo/sections"));
}

/**
 * Wraps a section fetcher with billing metering. Each entry on the client is
 * `meter(customer, (s) => s.fetchX, defaultFeature?)`, which returns a function
 * with the fetcher's own input type and resolves to its unwrapped `.data`. The
 * picker indirection (rather than the fetcher itself) keeps the section
 * modules behind loadDataforseoSections.
 *
 * `defaultFeature` is the fallback credit feature; a caller can override it per
 * call by passing `creditFeature` in the input (e.g. an MCP tool attributing
 * spend to its own feature). The extra field is ignored by the fetchers, which
 * read named fields rather than spreading the input.
 *
 * `estimateUsd` is the raw-USD upper bound held before the call (see
 * pricing.ts). It is required, so an entry without a price does not compile.
 */
function meter<I, T>(
  customer: BillingCustomerContext,
  pick: (
    sections: DataforseoSections,
  ) => (input: I) => Promise<DataforseoApiResponse<T>>,
  defaultFeature: CreditFeature,
  estimateUsd: (input: I) => number,
): (input: I & { creditFeature?: CreditFeature }) => Promise<T> {
  return (input) =>
    meterDataforseoCall(
      customer,
      async () => pick(await loadDataforseoSections())(input),
      input.creditFeature ?? defaultFeature,
      () => estimateUsd(input),
    );
}

export function createDataforseoClient(customer: BillingCustomerContext) {
  return {
    business: {
      businessListings: meter(
        customer,
        (s) => s.fetchBusinessListingsSearch,
        "local_seo",
        (input) => pricing.businessListingsUsd(input.limit),
      ),
      questionsAnswers: meter(
        customer,
        (s) => s.fetchQuestionsAnswers,
        "local_seo",
        (input) => pricing.questionsAnswersUsd(input.depth),
      ),
      myBusinessInfo: meter(
        customer,
        (s) => s.fetchMyBusinessInfo,
        "local_seo",
        () => pricing.MY_BUSINESS_INFO_LIVE_USD,
      ),
      // task_post is where DataForSEO charges; collection runs unmetered
      // through fetchBusinessDataTaskResult (see index.ts).
      reviewsTaskPost: meter(
        customer,
        (s) => s.postGoogleReviewsTask,
        "local_seo",
        (input) =>
          pricing.reviewsTaskUsd(input.depth, input.includeOtherSources),
      ),
      updatesTaskPost: meter(
        customer,
        (s) => s.postMyBusinessUpdatesTask,
        "local_seo",
        (input) => pricing.updatesTaskUsd(input.depth),
      ),
    },
    backlinks: {
      summary: meter(
        customer,
        (s) => s.fetchBacklinksSummary,
        "backlinks",
        () => pricing.backlinksUsd(1),
      ),
      rows: meter(
        customer,
        (s) => s.fetchBacklinksRows,
        "backlinks",
        (input) => pricing.backlinksUsd(input.limit),
      ),
      referringDomains: meter(
        customer,
        (s) => s.fetchReferringDomains,
        "backlinks",
        (input) => pricing.backlinksUsd(input.limit),
      ),
      domainPages: meter(
        customer,
        (s) => s.fetchDomainPagesSummary,
        "backlinks",
        (input) => pricing.backlinksUsd(input.limit),
      ),
      history: meter(
        customer,
        (s) => s.fetchBacklinksHistory,
        "backlinks",
        (input) => pricing.backlinksHistoryUsd(input.dateFrom, input.dateTo),
      ),
    },
    keywords: {
      related: meter(
        customer,
        (s) => s.fetchRelatedKeywords,
        "keyword_research",
        (input) => pricing.labsUsd(input.limit, input.includeClickstreamData),
      ),
      suggestions: meter(
        customer,
        (s) => s.fetchKeywordSuggestions,
        "keyword_research",
        (input) => pricing.labsUsd(input.limit, input.includeClickstreamData),
      ),
      ideas: meter(
        customer,
        (s) => s.fetchKeywordIdeas,
        "keyword_research",
        (input) => pricing.labsUsd(input.limit, input.includeClickstreamData),
      ),
      // Google Ads endpoints for countries Labs doesn't support.
      adsIdeas: meter(
        customer,
        (s) => s.fetchAdsKeywordIdeas,
        "keyword_research",
        () => pricing.GOOGLE_ADS_LIVE_TASK_USD,
      ),
      adsSearchVolume: meter(
        customer,
        (s) => s.fetchAdsSearchVolume,
        "keyword_research",
        () => pricing.GOOGLE_ADS_LIVE_TASK_USD,
      ),
      // Backfill for fields the expansion endpoints leave empty. Called only
      // when a row is actually missing one — see research/backfill.ts.
      searchIntent: meter(
        customer,
        (s) => s.fetchSearchIntent,
        "keyword_research",
        (input) => pricing.labsUsd(input.keywords.length),
      ),
      bulkKeywordDifficulty: meter(
        customer,
        (s) => s.fetchBulkKeywordDifficulty,
        "keyword_research",
        (input) => pricing.labsUsd(input.keywords.length),
      ),
      googleTrends: meter(
        customer,
        (s) => s.fetchGoogleTrends,
        "keyword_research",
        () => pricing.GOOGLE_TRENDS_LIVE_USD,
      ),
      subregionInterests: meter(
        customer,
        (s) => s.fetchSubregionInterests,
        "keyword_research",
        () => pricing.GOOGLE_TRENDS_LIVE_USD,
      ),
      demography: meter(
        customer,
        (s) => s.fetchDemography,
        "keyword_research",
        () => pricing.GOOGLE_TRENDS_LIVE_USD,
      ),
      autocomplete: meter(
        customer,
        (s) => s.fetchAutocomplete,
        "keyword_research",
        () => pricing.AUTOCOMPLETE_LIVE_USD,
      ),
      history: meter(
        customer,
        (s) => s.fetchHistoricalKeywordData,
        "keyword_research",
        () => pricing.labsUsd(1),
      ),
    },
    domain: {
      rankOverview: meter(
        customer,
        (s) => s.fetchDomainRankOverview,
        "domain_overview",
        () => pricing.labsUsd(1),
      ),
      rankedKeywords: meter(
        customer,
        (s) => s.fetchRankedKeywords,
        "domain_overview",
        (input) => pricing.labsUsd(input.limit),
      ),
      relevantPages: meter(
        customer,
        (s) => s.fetchRelevantPages,
        "domain_overview",
        (input) => pricing.labsUsd(input.limit),
      ),
    },
    serp: {
      live: meter(
        customer,
        (s) => s.fetchLiveSerp,
        "keyword_research",
        (input) => pricing.serpUsd(100, "live", input.keyword),
      ),
      rankCheck: meter(
        customer,
        (s) => s.fetchRankCheckSerp,
        "rank_tracking",
        (input) => pricing.serpUsd(input.depth, "live", input.keyword),
      ),
      // Posts up to 100 queued rank check tasks; one metered charge covers the
      // whole batch (DataForSEO bills task_post at post time, collection is
      // free).
      rankCheckTaskPost: meter(
        customer,
        (s) => s.postRankCheckTasks,
        "rank_tracking",
        (input) =>
          input.tasks.reduce(
            (sum, task) =>
              sum + pricing.serpUsd(input.depth, "queued", task.keyword),
            0,
          ),
      ),
      local: meter(
        customer,
        (s) => s.fetchLocalSerp,
        "local_seo",
        (input) => pricing.localSerpUsd(input.searchType, input.depth),
      ),
    },
    labs: {
      // Callers (e.g. the keyword-metrics MCP tool) can attribute the spend to
      // their own feature by passing `creditFeature` in the input; defaults to
      // rank_tracking when omitted.
      keywordOverview: meter(
        customer,
        (s) => s.fetchKeywordOverview,
        "rank_tracking",
        (input) =>
          pricing.labsUsd(input.keywords.length, input.includeClickstreamData),
      ),
      serpCompetitors: meter(
        customer,
        (s) => s.fetchSerpCompetitors,
        "keyword_research",
        (input) => pricing.labsUsd(input.limit),
      ),
    },
    lighthouse: {
      live: meter(
        customer,
        (s) => s.fetchLighthouseResult,
        "site_audit",
        () => pricing.LIGHTHOUSE_LIVE_USD,
      ),
    },
    aiSearch: {
      mentionsSearch: meter(
        customer,
        (s) => s.fetchLlmMentionsSearch,
        "ai_citations",
        (input) => pricing.llmMentionsSearchUsd(input.limit),
      ),
      aggregatedMetrics: meter(
        customer,
        (s) => s.fetchLlmAggregatedMetrics,
        "ai_citations",
        () => pricing.LLM_MENTIONS_ONE_ROW_USD,
      ),
      topPages: meter(
        customer,
        (s) => s.fetchLlmTopPages,
        "ai_citations",
        () => pricing.LLM_MENTIONS_ONE_ROW_USD,
      ),
      crossAggregatedMetrics: meter(
        customer,
        (s) => s.fetchLlmCrossAggregatedMetrics,
        "ai_citations",
        () => pricing.LLM_MENTIONS_ONE_ROW_USD,
      ),
      llmResponse: meter(
        customer,
        (s) => s.fetchLlmResponse,
        "ai_prompt_responses",
        (input) => pricing.llmResponseUsd(input.modelSlug, input.webSearch),
      ),
    },
  } as const;
}

async function meterDataforseoCall<T>(
  customer: BillingCustomerContext,
  execute: () => Promise<DataforseoApiResponse<T>>,
  creditFeature: CreditFeature,
  estimateUsd: () => number,
): Promise<T> {
  const isHostedMode = await isHostedServerAuthMode();

  if (!isHostedMode) {
    const result = await execute();
    return result.data;
  }

  const billingCustomer = await getOrCreateOrganizationCustomer(customer);

  // Holding the estimate before the call is what stops concurrent calls from
  // spending past the balance. Passing the feature lets the local billing
  // provider refuse a tool the organization's plan does not include, before any
  // provider spend happens.
  const hold = await reserveUsageCredits({
    customerId: billingCustomer.id,
    creditFeature,
    estimateUsd: estimateUsd(),
  });
  const settle = (billing: DataforseoApiCallCost | null) =>
    settleUsageCredits({
      customer,
      hold,
      creditFeature,
      costUsd: billing?.costUsd ?? 0,
      properties: {
        provider: "dataforseo",
        paths: billing ? [billing.path.join("/")] : [],
        fromCache: false,
      },
    });

  let result: DataforseoApiResponse<T>;
  try {
    result = await execute();
  } catch (error) {
    if (error instanceof DataforseoChargedTaskError) {
      await settle(error.billing);
      // A malformed request (DataForSEO "Invalid Field: ...") that DataForSEO
      // did not bill returns no value to the customer, so don't charge — surface
      // it as a non-reportable VALIDATION_ERROR. If DataForSEO still billed us
      // (costUsd > 0), the settle above charged it so the spend stays metered.
      if (error.isInvalidField && error.billing.costUsd <= 0) {
        throw new AppError("VALIDATION_ERROR", error.message);
      }
    } else {
      // No billing metadata came back: DataForSEO did not bill the call.
      await settle(null);
    }
    throw error;
  }

  await settle(result.billing);
  return result.data;
}
