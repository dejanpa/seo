import type {
  GoogleTrendsData,
  KeywordAudienceData,
  KeywordResearchRow,
} from "@/types/keywords";
import type { ResolvedResearchKeywordsInput } from "@/types/schemas/keywords";

const MONTHLY_SEARCHES = [
  { year: 2025, month: 4, searchVolume: 1200 },
  { year: 2025, month: 5, searchVolume: 1600 },
  { year: 2025, month: 6, searchVolume: 2400 },
  { year: 2025, month: 7, searchVolume: 3200 },
  { year: 2025, month: 8, searchVolume: 4200 },
  { year: 2025, month: 9, searchVolume: 3600 },
  { year: 2025, month: 10, searchVolume: 3000 },
  { year: 2025, month: 11, searchVolume: 2600 },
  { year: 2025, month: 12, searchVolume: 2200 },
  { year: 2026, month: 1, searchVolume: 2100 },
  { year: 2026, month: 2, searchVolume: 2300 },
  { year: 2026, month: 3, searchVolume: 2800 },
];

function makeRow(
  keyword: string,
  index: number,
  overrides: Partial<KeywordResearchRow> = {},
): KeywordResearchRow {
  return {
    keyword,
    searchVolume: 20_000 - index * 750,
    trend: MONTHLY_SEARCHES,
    keywordDifficulty: 40 + (index % 40),
    cpc: Number((1.25 + index * 0.15).toFixed(2)),
    competition: Number((0.05 + (index % 10) * 0.04).toFixed(2)),
    intent: index % 3 === 0 ? "commercial" : "informational",
    ...overrides,
  };
}

export function getKeywordResearchFixture(data: ResolvedResearchKeywordsInput) {
  const seedKeyword = data.keywords[0] ?? "keyword research";
  const rows = [
    makeRow(seedKeyword, 0, {
      searchVolume: 288_431,
      keywordDifficulty: 78,
      cpc: 11.93,
      competition: 0.07,
      intent: "informational",
    }),
    makeRow(`${seedKeyword} tools`, 1),
    makeRow(`${seedKeyword} software`, 2),
    makeRow(`${seedKeyword} checklist`, 3),
    makeRow(`${seedKeyword} template`, 4),
    makeRow(`${seedKeyword} examples`, 5),
    makeRow(`${seedKeyword} guide`, 6),
    makeRow(`${seedKeyword} strategy`, 7),
    makeRow(`${seedKeyword} platform`, 8),
    makeRow(`${seedKeyword} generator`, 9),
  ];

  return {
    rows,
    source: "related" as const,
    usedFallback: false,
    diagnostics: {
      requestedMode: data.mode,
      threshold: 3,
      sourceAttempts: [
        {
          source: "related" as const,
          rowCount: rows.length,
          nonSeedCount: rows.length - 1,
        },
      ],
    },
  };
}

/**
 * Five years of weekly-ish interest with a clear seasonal shape, so the
 * Interest over time panel exercises the same axis-thinning the real payload
 * does without spending a Google Trends task.
 */
export function getKeywordTrendsFixture(keyword: string): GoogleTrendsData {
  const interest = Array.from({ length: 60 }, (_, index) => {
    const month = index % 12;
    const seasonal = Math.round(45 + 35 * Math.sin((month / 12) * 2 * Math.PI));
    return {
      date: `${2021 + Math.floor(index / 12)}-${String(month + 1).padStart(2, "0")}-01`,
      value: Math.min(100, seasonal + Math.floor(index / 12) * 3),
    };
  });

  return {
    interest,
    topQueries: [
      { query: `${keyword} tool`, value: 100 },
      { query: `free ${keyword}`, value: 82 },
      { query: `${keyword} template`, value: 54 },
    ],
    risingQueries: [
      { query: `ai ${keyword}`, value: 4500 },
      { query: `${keyword} 2026`, value: 900 },
    ],
  };
}

export function getKeywordAudienceFixture(): KeywordAudienceData {
  return {
    regions: [
      { region: "California", value: 100 },
      { region: "New York", value: 82 },
      { region: "Texas", value: 61 },
      { region: "Washington", value: 47 },
      { region: "Illinois", value: 33 },
    ],
    age: [
      { label: "18-24", value: 42 },
      { label: "25-34", value: 100 },
      { label: "35-44", value: 78 },
      { label: "45-54", value: 41 },
      { label: "55-64", value: 19 },
    ],
    gender: [
      { label: "male", value: 100 },
      { label: "female", value: 71 },
    ],
  };
}

export function getKeywordAutocompleteFixture(keyword: string) {
  return [
    { suggestion: `${keyword} tools`, relevance: 1900 },
    { suggestion: `${keyword} free`, relevance: 1750 },
    { suggestion: `${keyword} for beginners`, relevance: 1600 },
    { suggestion: `${keyword} ai`, relevance: 1450 },
    { suggestion: `${keyword} template excel`, relevance: 1200 },
  ];
}
