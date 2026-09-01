import { beforeEach, describe, expect, it, vi } from "vitest";

const { dataforseoClientMock } = vi.hoisted(() => ({
  dataforseoClientMock: {
    keywords: {
      searchIntent: vi.fn(),
      bulkKeywordDifficulty: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/dataforseo", () => ({
  createDataforseoClient: vi.fn(() => dataforseoClientMock),
}));

import type { BillingCustomerContext } from "@/server/billing/subscription";
import { backfillMissingMetrics } from "./backfill";
import type { EnrichedKeyword } from "./helpers";

const { searchIntent, bulkKeywordDifficulty } = dataforseoClientMock.keywords;

const billingCustomer: BillingCustomerContext = {
  organizationId: "org_123",
  userId: "user_123",
  userEmail: "alice@example.com",
};

function row(overrides: Partial<EnrichedKeyword> = {}): EnrichedKeyword {
  return {
    keyword: "hotel reykjavik",
    searchVolume: 1300,
    trend: [],
    cpc: 2.5,
    competition: null,
    keywordDifficulty: 40,
    intent: "informational",
    ...overrides,
  };
}

const labs = {
  locationCode: 2840,
  languageCode: "en",
  provider: "labs" as const,
};

beforeEach(() => {
  searchIntent.mockResolvedValue([]);
  bulkKeywordDifficulty.mockResolvedValue([]);
});

describe("backfillMissingMetrics", () => {
  it("buys nothing when every row already has an intent and a difficulty", async () => {
    const rows = [row()];

    expect(await backfillMissingMetrics(rows, labs, billingCustomer)).toBe(
      rows,
    );
    expect(searchIntent).not.toHaveBeenCalled();
    expect(bulkKeywordDifficulty).not.toHaveBeenCalled();
  });

  it("skips both calls a Google-Ads market cannot use", async () => {
    // Iceland routes to Google Ads because Labs has no data for it, and
    // bulk_keyword_difficulty is a location-scoped Labs endpoint. Icelandic is
    // also not one of the languages search_intent accepts, so asking would buy
    // a charged "Invalid Field".
    const [result] = await backfillMissingMetrics(
      [row({ intent: "unknown", keywordDifficulty: null })],
      { locationCode: 2352, languageCode: "is", provider: "google_ads" },
      billingCustomer,
    );

    expect(searchIntent).not.toHaveBeenCalled();
    expect(bulkKeywordDifficulty).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      intent: "unknown",
      keywordDifficulty: null,
    });
  });

  it("labels a Google-Ads row when the market's language is supported", async () => {
    searchIntent.mockResolvedValue([
      { keyword: "Hotel Reykjavik", keyword_intent: { label: "commercial" } },
    ]);

    const [result] = await backfillMissingMetrics(
      [row({ intent: "unknown", keywordDifficulty: null })],
      { locationCode: 2070, languageCode: "bs", provider: "google_ads" },
      billingCustomer,
    );

    expect(result.intent).toBe("commercial");
    // Still no Labs difficulty to buy for a market Labs does not serve.
    expect(bulkKeywordDifficulty).not.toHaveBeenCalled();
    expect(result.keywordDifficulty).toBeNull();
  });

  it("keeps the paid-for rows when the backfill call fails", async () => {
    bulkKeywordDifficulty.mockRejectedValue(new Error("provider down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const rows = [row({ keywordDifficulty: null })];

    expect(await backfillMissingMetrics(rows, labs, billingCustomer)).toEqual(
      rows,
    );
  });
});
