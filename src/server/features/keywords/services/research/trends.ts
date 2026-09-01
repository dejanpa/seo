import { waitUntil } from "cloudflare:workers";
import { z } from "zod";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import { createDataforseoClient } from "@/server/lib/dataforseo";
import { buildCacheKey, getCached, setCached } from "@/server/lib/r2-cache";
import type { GoogleTrendsData, KeywordAudienceData } from "@/types/keywords";
import { normalizeKeyword } from "./helpers";

/**
 * Google Trends for the searched keyword.
 *
 * A weekly five-year series barely moves day to day, so this is cached far
 * longer than a SERP: re-opening the same keyword tomorrow should not buy the
 * same task again.
 */
const TRENDS_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

type KeywordTrendsResult = GoogleTrendsData & {
  requestedKeyword: string;
};

const relatedQuerySchema = z.object({
  query: z.string(),
  value: z.number(),
});

const trendsCacheSchema = z.object({
  requestedKeyword: z.string(),
  interest: z.array(z.object({ date: z.string(), value: z.number() })),
  topQueries: z.array(relatedQuerySchema),
  risingQueries: z.array(relatedQuerySchema),
});

export async function getKeywordTrends(
  input: {
    projectId: string;
    keyword: string;
    locationCode: number;
    languageCode: string;
  },
  billingCustomer: BillingCustomerContext,
): Promise<KeywordTrendsResult> {
  const keyword = normalizeKeyword(input.keyword);

  const cacheKey = await buildCacheKey("kw:trends", {
    organizationId: billingCustomer.organizationId,
    projectId: input.projectId,
    keyword,
    locationCode: input.locationCode,
    languageCode: input.languageCode,
  });

  const cached = trendsCacheSchema.safeParse(await getCached(cacheKey));
  if (cached.success) {
    return cached.data;
  }

  const data = await createDataforseoClient(
    billingCustomer,
  ).keywords.googleTrends({
    keyword,
    locationCode: input.locationCode,
    languageCode: input.languageCode,
  });

  const result: KeywordTrendsResult = { requestedKeyword: keyword, ...data };

  // waitUntil, not void: workerd cancels unregistered pending I/O once the
  // response is sent, so a fire-and-forget put never persists the cache.
  waitUntil(
    setCached(cacheKey, result, TRENDS_CACHE_TTL_SECONDS).catch((error) => {
      console.error("keywords.trends.cache-write failed:", error);
    }),
  );

  return result;
}

const AUDIENCE_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

const demographySplitSchema = z.array(
  z.object({ label: z.string(), value: z.number() }),
);

const audienceCacheSchema = z.object({
  requestedKeyword: z.string(),
  regions: z.array(z.object({ region: z.string(), value: z.number() })),
  age: demographySplitSchema,
  gender: demographySplitSchema,
});

type KeywordAudienceResult = KeywordAudienceData & { requestedKeyword: string };

/**
 * Who is searching and where.
 *
 * Two separate tasks, run together because they answer one question and the
 * UI shows them in one panel. Settled rather than all-or-nothing: each is
 * charged on its own, so a failure in one must not throw away the other.
 */
export async function getKeywordAudience(
  input: {
    projectId: string;
    keyword: string;
    locationCode: number;
  },
  billingCustomer: BillingCustomerContext,
): Promise<KeywordAudienceResult> {
  const keyword = normalizeKeyword(input.keyword);

  const cacheKey = await buildCacheKey("kw:audience", {
    organizationId: billingCustomer.organizationId,
    projectId: input.projectId,
    keyword,
    locationCode: input.locationCode,
  });

  const cached = audienceCacheSchema.safeParse(await getCached(cacheKey));
  if (cached.success) {
    return cached.data;
  }

  const client = createDataforseoClient(billingCustomer);
  const [regions, demography] = await Promise.allSettled([
    client.keywords.subregionInterests({
      keyword,
      locationCode: input.locationCode,
    }),
    client.keywords.demography({
      keyword,
      locationCode: input.locationCode,
    }),
  ]);

  if (regions.status === "rejected" && demography.status === "rejected") {
    throw regions.reason;
  }

  logRejection("regions", regions);
  logRejection("demography", demography);

  const result: KeywordAudienceResult = {
    requestedKeyword: keyword,
    regions: regions.status === "fulfilled" ? regions.value : [],
    age: demography.status === "fulfilled" ? demography.value.age : [],
    gender: demography.status === "fulfilled" ? demography.value.gender : [],
  };

  waitUntil(
    setCached(cacheKey, result, AUDIENCE_CACHE_TTL_SECONDS).catch((error) => {
      console.error("keywords.audience.cache-write failed:", error);
    }),
  );

  return result;
}

function logRejection(label: string, settled: PromiseSettledResult<unknown>) {
  if (settled.status === "rejected") {
    console.error(`keywords.audience.${label} failed:`, settled.reason);
  }
}
