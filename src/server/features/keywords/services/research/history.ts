import { waitUntil } from "cloudflare:workers";
import { z } from "zod";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import { createDataforseoClient } from "@/server/lib/dataforseo";
import { buildCacheKey, getCached, setCached } from "@/server/lib/r2-cache";
import type { KeywordHistoryPoint } from "@/types/keywords";
import { normalizeKeyword } from "./helpers";

/** Months do not change once past, so this is cached as long as the trends. */
const HISTORY_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

const historyCacheSchema = z.object({
  requestedKeyword: z.string(),
  history: z.array(
    z.object({
      year: z.number(),
      month: z.number(),
      searchVolume: z.number().nullable(),
      cpc: z.number().nullable(),
      competition: z.number().nullable(),
    }),
  ),
});

type KeywordHistoryResult = {
  requestedKeyword: string;
  history: KeywordHistoryPoint[];
};

export async function getKeywordHistory(
  input: {
    projectId: string;
    keyword: string;
    locationCode: number;
    languageCode: string;
  },
  billingCustomer: BillingCustomerContext,
): Promise<KeywordHistoryResult> {
  const keyword = normalizeKeyword(input.keyword);

  const cacheKey = await buildCacheKey("kw:history", {
    organizationId: billingCustomer.organizationId,
    projectId: input.projectId,
    keyword,
    locationCode: input.locationCode,
    languageCode: input.languageCode,
  });

  const cached = historyCacheSchema.safeParse(await getCached(cacheKey));
  if (cached.success) {
    return cached.data;
  }

  const history = await createDataforseoClient(
    billingCustomer,
  ).keywords.history({
    keyword,
    locationCode: input.locationCode,
    languageCode: input.languageCode,
  });

  const result: KeywordHistoryResult = { requestedKeyword: keyword, history };

  waitUntil(
    setCached(cacheKey, result, HISTORY_CACHE_TTL_SECONDS).catch((error) => {
      console.error("keywords.history.cache-write failed:", error);
    }),
  );

  return result;
}
