import { z } from "zod";
import {
  KeywordsDataDataforseoTrendsDemographyLiveRequestInfo,
  KeywordsDataDataforseoTrendsSubregionInterestsLiveRequestInfo,
  KeywordsDataGoogleTrendsExploreLiveRequestInfo,
} from "dataforseo-client";
import { keywordsDataApi } from "@/server/lib/dataforseo/core";
import {
  assertOk,
  buildTaskBilling,
  type DataforseoApiResponse,
} from "@/server/lib/dataforseo/envelope";
import type {
  DemographySplit,
  GoogleTrendsData,
  KeywordDemography,
  RegionInterest,
  TrendsInterestPoint,
  TrendsRelatedQuery,
} from "@/types/keywords";

/**
 * Google Trends for one keyword: relative interest over time, plus the
 * queries rising around it.
 *
 * Relative interest is a different question from search volume — attention,
 * not counts — which is why this earns a panel next to the volume chart rather
 * than replacing it.
 */

/**
 * The keyword table already carries the last twelve months of volume, so a
 * second twelve-month view would add nothing. Five years costs the same task
 * and shows seasonality and long-term direction instead.
 */
const TIME_RANGE = "past_5_years";

// The SDK types every Google Trends item as a bag of `any`, so the fields we
// read are validated here rather than trusted. Same approach as the ranked
// SERP item schema in labs.ts.
const graphItemSchema = z.object({
  type: z.literal("google_trends_graph"),
  data: z
    .array(
      z.object({
        date_from: z.string().nullable().optional(),
        missing_data: z.boolean().nullable().optional(),
        values: z.array(z.number().nullable()).nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
});

const relatedQuerySchema = z.object({
  query: z.string(),
  value: z.number(),
});

const queriesItemSchema = z.object({
  type: z.literal("google_trends_queries_list"),
  data: z
    .object({
      top: z.array(z.unknown()).nullable().optional(),
      rising: z.array(z.unknown()).nullable().optional(),
    })
    .nullable()
    .optional(),
});

export async function fetchGoogleTrends(input: {
  keyword: string;
  locationCode: number;
  languageCode: string;
}): Promise<DataforseoApiResponse<GoogleTrendsData>> {
  const response = await keywordsDataApi().googleTrendsExploreLive([
    new KeywordsDataGoogleTrendsExploreLiveRequestInfo({
      keywords: [input.keyword],
      // Google Trends is the one endpoint that wants location_code as a
      // string; a number comes back as a charged "Invalid Field".
      location_code: String(input.locationCode),
      language_code: input.languageCode,
      time_range: TIME_RANGE,
      // Both in one task rather than two. The queries list is only returned
      // for a single keyword, which is all we ever ask for.
      item_types: ["google_trends_graph", "google_trends_queries_list"],
    }),
  ]);
  const task = assertOk(response);

  return {
    data: parseTrendsItems(task.result?.[0]?.items ?? []),
    billing: buildTaskBilling(task),
  };
}

function parseTrendsItems(items: unknown[]): GoogleTrendsData {
  const result: GoogleTrendsData = {
    interest: [],
    topQueries: [],
    risingQueries: [],
  };

  for (const item of items) {
    const graph = graphItemSchema.safeParse(item);
    if (graph.success) {
      result.interest = parseInterest(graph.data.data ?? []);
      continue;
    }

    const queries = queriesItemSchema.safeParse(item);
    if (queries.success) {
      result.topQueries = parseRelatedQueries(queries.data.data?.top ?? []);
      result.risingQueries = parseRelatedQueries(
        queries.data.data?.rising ?? [],
      );
    }
  }

  return result;
}

function parseInterest(
  points: z.infer<typeof graphItemSchema>["data"] & object,
): TrendsInterestPoint[] {
  return points.flatMap((point) => {
    // Google marks gaps with a dotted line rather than a zero; plotting them
    // as zero would draw a collapse in interest that never happened.
    if (point.missing_data === true) return [];
    const value = point.values?.[0];
    if (!point.date_from || value == null) return [];
    return [{ date: point.date_from, value }];
  });
}

/** The element shape inside `top` / `rising` is untyped by the SDK, so an
 * entry that doesn't match is dropped rather than guessed at. */
function parseRelatedQueries(entries: unknown[]): TrendsRelatedQuery[] {
  return entries.flatMap((entry) => {
    const parsed = relatedQuerySchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

// --- DataForSEO Trends: who is searching, and where ------------------------
// Clickstream-derived rather than Google Trends sampled, and — unlike the
// Google Trends endpoint above — these take location_code as a number.

const AUDIENCE_TIME_RANGE = "past_12_months";

const namedValueSchema = z.object({
  type: z.string(),
  value: z.number().nullable().optional(),
});

const subregionItemSchema = z.object({
  interests: z
    .array(
      z.object({
        values: z
          .array(
            z.object({
              geo_name: z.string().nullable().optional(),
              value: z.number().nullable().optional(),
            }),
          )
          .nullable()
          .optional(),
      }),
    )
    .nullable()
    .optional(),
});

const demographyItemSchema = z.object({
  demography: z
    .object({
      age: z
        .array(
          z.object({ values: z.array(namedValueSchema).nullable().optional() }),
        )
        .nullable()
        .optional(),
      gender: z
        .array(
          z.object({ values: z.array(namedValueSchema).nullable().optional() }),
        )
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});

/**
 * Where in the country the demand actually sits.
 *
 * The provider returns every region including the ones with no interest at
 * all; a list of fifty states where thirty are zero is noise, so zeros are
 * dropped and the strongest come first.
 */
export async function fetchSubregionInterests(input: {
  keyword: string;
  locationCode: number;
}): Promise<DataforseoApiResponse<RegionInterest[]>> {
  const response =
    await keywordsDataApi().dataforseoTrendsSubregionInterestsLive([
      new KeywordsDataDataforseoTrendsSubregionInterestsLiveRequestInfo({
        keywords: [input.keyword],
        location_code: input.locationCode,
        time_range: AUDIENCE_TIME_RANGE,
      }),
    ]);
  const task = assertOk(response);

  const item = subregionItemSchema.safeParse(task.result?.[0]?.items?.[0]);
  const values = item.success ? (item.data.interests?.[0]?.values ?? []) : [];

  return {
    data: values
      .flatMap((entry) =>
        entry.geo_name && entry.value != null && entry.value > 0
          ? [{ region: entry.geo_name, value: entry.value }]
          : [],
      )
      .toSorted((a, b) => b.value - a.value),
    billing: buildTaskBilling(task),
  };
}

/** Age and gender split of the people searching. */
export async function fetchDemography(input: {
  keyword: string;
  locationCode: number;
}): Promise<DataforseoApiResponse<KeywordDemography>> {
  const response = await keywordsDataApi().dataforseoTrendsDemographyLive([
    new KeywordsDataDataforseoTrendsDemographyLiveRequestInfo({
      keywords: [input.keyword],
      location_code: input.locationCode,
      time_range: AUDIENCE_TIME_RANGE,
    }),
  ]);
  const task = assertOk(response);

  const item = demographyItemSchema.safeParse(task.result?.[0]?.items?.[0]);
  const demography = item.success ? item.data.demography : null;

  return {
    data: {
      age: parseSplit(demography?.age?.[0]?.values ?? []),
      gender: parseSplit(demography?.gender?.[0]?.values ?? []),
    },
    billing: buildTaskBilling(task),
  };
}

function parseSplit(
  values: Array<{ type: string; value?: number | null }>,
): DemographySplit[] {
  return values.flatMap((entry) =>
    entry.value == null ? [] : [{ label: entry.type, value: entry.value }],
  );
}
