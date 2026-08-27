import { waitUntil } from "cloudflare:workers";
import { buildCacheKey, getCached, setCached } from "@/server/lib/r2-cache";
import { z } from "zod";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import type { CreditFeature } from "@/shared/billing-credit-features";
import { createDataforseoClient } from "@/server/lib/dataforseo";
import { buildRankedKeywordsScopeFilter } from "@/server/lib/dataforseo/researchScopeFilters";
import { joinClauses } from "@/server/lib/dataforseo/filters";
import { parseResearchTargetOrThrow } from "@/server/lib/domainUtils";
import type { ResearchScope } from "@/shared/researchScope";
import { mapKeywordItem } from "@/server/features/domain/services/domainKeywordMapper";
import { getKeywordsPage } from "@/server/features/domain/services/domainKeywordsPage";
import { getPagesPage } from "@/server/features/domain/services/domainPagesPage";

// Lets a caller attribute spend to its own feature (e.g. onboarding). Applied
// to the DataForSEO call, not the cache key, so cached results are shared
// across callers.
type MeteringOverrides = {
  creditFeature?: CreditFeature;
};

/** Domain overview data is refreshed every 12 hours. */
const DOMAIN_OVERVIEW_TTL_SECONDS = 12 * 60 * 60;

// Every field below rides along on the same domain_rank_overview response, so
// the richer overview costs no extra DataForSEO call. The fields added after
// the first release are nullish so entries cached under the old shape still
// parse — they simply render without the charts until the 12h TTL rolls over.
const domainOverviewResultSchema = z.object({
  domain: z.string(),
  organicTraffic: z.number().nullable(),
  organicKeywords: z.number().nullable(),
  /** Monthly cost (USD) of buying the organic traffic through ads. */
  trafficValue: z.number().nullish(),
  positions: z
    .object({
      top3: z.number(),
      pos4to10: z.number(),
      pos11to20: z.number(),
      pos21to50: z.number(),
      pos51to100: z.number(),
    })
    .nullish(),
  movement: z
    .object({
      new: z.number(),
      up: z.number(),
      down: z.number(),
      lost: z.number(),
    })
    .nullish(),
  paidKeywords: z.number().nullish(),
  paidTraffic: z.number().nullish(),
  backlinks: z.number().nullable(),
  referringDomains: z.number().nullable(),
  hasData: z.boolean(),
  fetchedAt: z.string(),
});

type RankMetrics = {
  pos_1?: number;
  pos_2_3?: number;
  pos_4_10?: number;
  pos_11_20?: number;
  pos_21_30?: number;
  pos_31_40?: number;
  pos_41_50?: number;
  pos_51_60?: number;
  pos_61_70?: number;
  pos_71_80?: number;
  pos_81_90?: number;
  pos_91_100?: number;
  etv?: number;
  count?: number;
  estimated_paid_traffic_cost?: number;
  is_new?: number;
  is_up?: number;
  is_down?: number;
  is_lost?: number;
};

function sum(...values: Array<number | undefined>): number {
  return values.reduce((total: number, value) => total + (value ?? 0), 0);
}

function round(value: number | undefined): number | null {
  return value == null ? null : Math.round(value);
}

/** Groups the twelve raw position buckets into the five people reason about. */
function toPositions(metrics: RankMetrics | undefined) {
  if (!metrics) return null;
  return {
    top3: sum(metrics.pos_1, metrics.pos_2_3),
    pos4to10: sum(metrics.pos_4_10),
    pos11to20: sum(metrics.pos_11_20),
    pos21to50: sum(metrics.pos_21_30, metrics.pos_31_40, metrics.pos_41_50),
    pos51to100: sum(
      metrics.pos_51_60,
      metrics.pos_61_70,
      metrics.pos_71_80,
      metrics.pos_81_90,
      metrics.pos_91_100,
    ),
  };
}

function toMovement(metrics: RankMetrics | undefined) {
  if (!metrics) return null;
  return {
    new: metrics.is_new ?? 0,
    up: metrics.is_up ?? 0,
    down: metrics.is_down ?? 0,
    lost: metrics.is_lost ?? 0,
  };
}

type DomainOverviewResult = z.infer<typeof domainOverviewResultSchema> & {
  /** Requested research scope, echoed for display. */
  scope: ResearchScope;
  displayTarget: string;
};

async function getOverview(
  input: {
    projectId: string;
    domain: string;
    scope?: ResearchScope;
    locationCode: number;
    languageCode: string;
  },
  billingCustomer: BillingCustomerContext,
  metering: MeteringOverrides = {},
): Promise<DomainOverviewResult> {
  const target = parseResearchTargetOrThrow(input.domain, input.scope);
  const domain = target.hostname;

  // domain_rank_overview has no filters and always covers the hostname plus
  // all of its subdomains, so every scope shares one cache entry per hostname.
  // Callers label the metrics as domain-wide for narrower scopes.
  const cacheKey = await buildCacheKey("domain:overview", {
    organizationId: billingCustomer.organizationId,
    projectId: input.projectId,
    domain,
    locationCode: input.locationCode,
    languageCode: input.languageCode,
  });

  const cachedRaw = await getCached(cacheKey);
  const cached = domainOverviewResultSchema.safeParse(cachedRaw);
  if (cached.success && cached.data.hasData) {
    return {
      ...cached.data,
      scope: target.scope,
      displayTarget: target.display,
    };
  }

  const nowIso = new Date().toISOString();
  const dataforseo = createDataforseoClient(billingCustomer);

  const metricsResponse = await dataforseo.domain.rankOverview({
    target: domain,
    locationCode: input.locationCode,
    languageCode: input.languageCode,
    ...metering,
  });

  const metrics = metricsResponse[0];
  const organic: RankMetrics | undefined = metrics?.metrics?.organic;
  const paid: RankMetrics | undefined = metrics?.metrics?.paid;

  const organicTraffic = round(organic?.etv);
  const organicKeywords = round(organic?.count);

  const stored: z.infer<typeof domainOverviewResultSchema> = {
    domain,
    organicTraffic,
    organicKeywords,
    trafficValue: round(organic?.estimated_paid_traffic_cost),
    positions: toPositions(organic),
    movement: toMovement(organic),
    paidKeywords: round(paid?.count),
    paidTraffic: round(paid?.etv),
    backlinks: null,
    referringDomains: null,
    hasData: organicKeywords != null && organicKeywords > 0,
    fetchedAt: nowIso,
  };

  if (stored.hasData) {
    // waitUntil, not void: workerd cancels unregistered pending I/O once the
    // response is sent, so a fire-and-forget put never persists the cache.
    waitUntil(
      setCached(cacheKey, stored, DOMAIN_OVERVIEW_TTL_SECONDS).catch(
        (error) => {
          console.error("domain.overview.cache-write failed:", error);
        },
      ),
    );
  }

  return { ...stored, scope: target.scope, displayTarget: target.display };
}

async function getSuggestedKeywords(
  input: {
    domain: string;
    scope?: ResearchScope;
    locationCode: number;
    languageCode: string;
    organizationId: string;
    projectId: string;
  },
  billingCustomer: BillingCustomerContext,
  metering: MeteringOverrides = {},
): Promise<
  Array<{
    keyword: string;
    position: number | null;
    searchVolume: number | null;
    traffic: number | null;
    cpc: number | null;
    keywordDifficulty: number | null;
  }>
> {
  const target = parseResearchTargetOrThrow(input.domain, input.scope);
  const scopeFilter = buildRankedKeywordsScopeFilter(target);

  const cacheKey = await buildCacheKey("domain:keyword-suggestions", {
    organizationId: billingCustomer.organizationId,
    projectId: input.projectId,
    domain: target.hostname,
    scope: target.scope,
    path: target.path,
    locationCode: input.locationCode,
    languageCode: input.languageCode,
  });

  const cachedRaw = await getCached(cacheKey);
  const cached = z
    .array(
      z.object({
        keyword: z.string(),
        position: z.number().nullable(),
        searchVolume: z.number().nullable(),
        traffic: z.number().nullable(),
        cpc: z.number().nullable(),
        keywordDifficulty: z.number().nullable(),
      }),
    )
    .safeParse(cachedRaw);
  if (cached.success && cached.data.length > 0) {
    return cached.data;
  }

  const dataforseo = createDataforseoClient(billingCustomer);

  const rankedKeywordsResponse = await dataforseo.domain.rankedKeywords({
    target: target.hostname,
    locationCode: input.locationCode,
    languageCode: input.languageCode,
    limit: 100,
    orderBy: ["ranked_serp_element.serp_item.etv,desc"],
    filters:
      scopeFilter.clauses.length > 0
        ? joinClauses(scopeFilter.clauses, "and")
        : undefined,
    ...metering,
  });

  const keywords = rankedKeywordsResponse.items
    .map((item) => mapKeywordItem(item))
    .filter(
      (item): item is NonNullable<ReturnType<typeof mapKeywordItem>> =>
        item != null,
    )
    .map((item) => ({
      keyword: item.keyword,
      position: item.position,
      searchVolume: item.searchVolume,
      traffic: item.traffic,
      cpc: item.cpc,
      keywordDifficulty: item.keywordDifficulty,
    }));

  if (keywords.length > 0) {
    waitUntil(
      setCached(cacheKey, keywords, DOMAIN_OVERVIEW_TTL_SECONDS).catch(
        (error) => {
          console.error(
            "domain.keyword-suggestions.cache-write failed:",
            error,
          );
        },
      ),
    );
  }

  return keywords;
}

export const DomainService = {
  getOverview,
  getSuggestedKeywords,
  getKeywordsPage,
  getPagesPage,
} as const;
