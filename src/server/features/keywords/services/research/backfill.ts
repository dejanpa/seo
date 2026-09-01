import { createDataforseoClient } from "@/server/lib/dataforseo";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import type { CreditFeature } from "@/shared/billing-credit-features";
import type { KeywordDataProvider } from "@/shared/keyword-locations";
import {
  normalizeIntent,
  normalizeKeyword,
  type EnrichedKeyword,
} from "./helpers";

/**
 * Fills the two fields the expansion endpoints leave empty.
 *
 * Related / suggestions / ideas usually return an intent and a difficulty with
 * each keyword, but the Google Ads path serves neither: for the countries Labs
 * does not cover, every row arrives with `intent: "unknown"` and a null
 * difficulty, which leaves the intent and difficulty panels blank and makes
 * "easiest wins" impossible to compute.
 *
 * Each call is made only when something is actually missing, so a complete
 * Labs result costs nothing extra, and both are best-effort: the research
 * result is already paid for and must not be lost to a backfill failure.
 */

/**
 * The languages `/v3/dataforseo_labs/google/search_intent/live` accepts. It is
 * a much shorter list than the one Labs serves generally, and an unsupported
 * code comes back as a *charged* "Invalid Field: 'language_code'", so this is
 * checked before spending rather than after.
 */
const SEARCH_INTENT_LANGUAGES = new Set([
  "ar",
  "bg",
  "bs",
  "cs",
  "da",
  "de",
  "el",
  "en",
  "es",
  "fi",
  "fr",
  "he",
  "hi",
  "hr",
  "hu",
  "it",
  "ja",
  "ko",
  "ms",
  "nb",
  "nl",
  "pl",
  "pt",
  "ro",
  "ru",
  "sk",
  "sl",
  "sr",
  "sv",
  "th",
  "tr",
  "uk",
  "vi",
  "zh-TW",
]);

type BackfillParams = {
  locationCode: number;
  languageCode: string;
  provider: KeywordDataProvider;
  creditFeature?: CreditFeature;
};

export async function backfillMissingMetrics(
  rows: EnrichedKeyword[],
  params: BackfillParams,
  billingCustomer: BillingCustomerContext,
): Promise<EnrichedKeyword[]> {
  const needsIntent = rows.filter((row) => row.intent === "unknown");
  const needsDifficulty = rows.filter((row) => row.keywordDifficulty === null);

  const wantsIntent =
    needsIntent.length > 0 && SEARCH_INTENT_LANGUAGES.has(params.languageCode);
  // Both Labs endpoints, and bulk_keyword_difficulty is location-scoped, so it
  // cannot serve the very countries that routed us to Google Ads. Their rows
  // keep a null difficulty; there is no Ads equivalent to buy.
  const wantsDifficulty =
    needsDifficulty.length > 0 && params.provider === "labs";

  if (!wantsIntent && !wantsDifficulty) return rows;

  const dataforseo = createDataforseoClient(billingCustomer);
  const [intents, difficulties] = await Promise.all([
    wantsIntent
      ? fetchIntents(dataforseo, needsIntent, params)
      : Promise.resolve(new Map<string, EnrichedKeyword["intent"]>()),
    wantsDifficulty
      ? fetchDifficulties(dataforseo, needsDifficulty, params)
      : Promise.resolve(new Map<string, number>()),
  ]);

  if (intents.size === 0 && difficulties.size === 0) return rows;

  return rows.map((row) => ({
    ...row,
    intent: intents.get(row.keyword) ?? row.intent,
    keywordDifficulty:
      row.keywordDifficulty ?? difficulties.get(row.keyword) ?? null,
  }));
}

async function fetchIntents(
  dataforseo: ReturnType<typeof createDataforseoClient>,
  rows: EnrichedKeyword[],
  params: BackfillParams,
): Promise<Map<string, EnrichedKeyword["intent"]>> {
  const result = new Map<string, EnrichedKeyword["intent"]>();
  try {
    const items = await dataforseo.keywords.searchIntent({
      keywords: rows.map((row) => row.keyword),
      languageCode: params.languageCode,
      creditFeature: params.creditFeature,
    });
    for (const item of items) {
      if (!item.keyword) continue;
      const intent = normalizeIntent(item.keyword_intent?.label);
      if (intent === "unknown") continue;
      result.set(normalizeKeyword(item.keyword), intent);
    }
  } catch (error) {
    console.error("keywords.research.backfill-intent failed:", error);
  }
  return result;
}

async function fetchDifficulties(
  dataforseo: ReturnType<typeof createDataforseoClient>,
  rows: EnrichedKeyword[],
  params: BackfillParams,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  try {
    const items = await dataforseo.keywords.bulkKeywordDifficulty({
      keywords: rows.map((row) => row.keyword),
      locationCode: params.locationCode,
      languageCode: params.languageCode,
      creditFeature: params.creditFeature,
    });
    for (const item of items) {
      if (!item.keyword || item.keyword_difficulty == null) continue;
      result.set(normalizeKeyword(item.keyword), item.keyword_difficulty);
    }
  } catch (error) {
    console.error("keywords.research.backfill-difficulty failed:", error);
  }
  return result;
}
