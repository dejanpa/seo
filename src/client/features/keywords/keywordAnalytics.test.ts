import { describe, expect, it } from "vitest";
import type { KeywordResearchRow, MonthlySearch } from "@/types/keywords";
import { computeKeywordAnalytics } from "./keywordAnalytics";

function months(
  start: { year: number; month: number },
  volumes: number[],
): MonthlySearch[] {
  return volumes.map((searchVolume, index) => {
    const zeroBased = start.year * 12 + (start.month - 1) + index;
    return {
      year: Math.floor(zeroBased / 12),
      month: (zeroBased % 12) + 1,
      searchVolume,
    };
  });
}

function row(overrides: Partial<KeywordResearchRow> = {}): KeywordResearchRow {
  return {
    keyword: "seo audit",
    searchVolume: 1000,
    trend: [],
    keywordDifficulty: 40,
    cpc: 2,
    competition: 0.5,
    intent: "informational",
    ...overrides,
  };
}

describe("computeKeywordAnalytics", () => {
  it("drops months only a minority of keywords reported", () => {
    // Two keywords cover Feb and Mar; only one reaches back to Jan, so the raw
    // sum for Jan is half the height and would read as a collapse in demand.
    const analytics = computeKeywordAnalytics([
      row({ trend: months({ year: 2026, month: 1 }, [500, 1000, 1000]) }),
      row({
        keyword: "seo tool",
        trend: months({ year: 2026, month: 2 }, [1000, 1000]),
      }),
    ]);

    expect(analytics.monthly.map((point) => point.key)).toEqual([
      "2026-02",
      "2026-03",
    ]);
    expect(analytics.partialMonths).toBe(1);
  });

  it("returns no month-over-month change when the two months are not consecutive", () => {
    // Apr is missing entirely. Comparing May against Mar and labelling it
    // month-over-month would be a wrong number, not a stale one.
    const trend: MonthlySearch[] = [
      { year: 2026, month: 3, searchVolume: 1000 },
      { year: 2026, month: 5, searchVolume: 2000 },
    ];

    const analytics = computeKeywordAnalytics([row({ trend })]);

    expect(analytics.aggregateTrend.monthly).toBeNull();
  });

  it("compares summed volume rather than averaging per-keyword percentages", () => {
    const analytics = computeKeywordAnalytics([
      row({ trend: months({ year: 2026, month: 1 }, [100, 150]) }),
      row({
        keyword: "seo tool",
        trend: months({ year: 2026, month: 1 }, [900, 850]),
      }),
    ]);

    // 1000 -> 1000 is flat, even though one keyword rose 50% and the other
    // fell 5.6% (whose average would claim a 22% rise).
    expect(analytics.aggregateTrend.monthly).toBe(0);
  });

  it("bands a fractional difficulty instead of dropping it", () => {
    const analytics = computeKeywordAnalytics([
      row({ keywordDifficulty: 19.5 }),
    ]);

    expect(analytics.difficultyBands).toEqual([
      { name: "Very easy", value: 1 },
    ]);
  });

  it("ranks a winnable mid-volume keyword above a high-difficulty giant", () => {
    const analytics = computeKeywordAnalytics([
      row({ keyword: "seo", searchVolume: 900_000, keywordDifficulty: 92 }),
      row({
        keyword: "seo audit checklist",
        searchVolume: 2400,
        keywordDifficulty: 12,
      }),
    ]);

    expect(analytics.topByVolume[0].keyword).toBe("seo");
    expect(analytics.easiestWins[0].keyword).toBe("seo audit checklist");
  });
});
