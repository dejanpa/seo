import type { CsvValue } from "@/client/lib/csv";
import { KEYWORD_RESEARCH_HEADERS } from "@/client/features/keywords/state/keywordControllerActions";
import type { KeywordAnalyticsRow } from "@/client/features/keywords/keywordAnalytics";
import type { KeywordIntent, SavedKeywordRow } from "@/types/keywords";
import type { GetSavedKeywordsInput } from "@/types/schemas/keywords";

export const SAVED_KEYWORD_PAGE_SIZES = [50, 100, 250] as const;
export const SAVED_KEYWORD_EXPORT_HEADERS = [
  ...KEYWORD_RESEARCH_HEADERS,
  "Tags",
  "Fetched At",
];

export function savedKeywordExportRow(row: SavedKeywordRow): CsvValue[] {
  return [
    row.keyword,
    row.searchVolume ?? "",
    row.cpc ?? "",
    row.competition ?? "",
    row.keywordDifficulty ?? "",
    row.intent ?? "",
    row.tags.map((tag) => tag.name).join(", "),
    row.fetchedAt ?? "",
  ];
}

export function toSavedKeywordSort(
  value: string | undefined,
): GetSavedKeywordsInput["sort"] {
  if (
    value === "keyword" ||
    value === "searchVolume" ||
    value === "cpc" ||
    value === "competition" ||
    value === "keywordDifficulty" ||
    value === "fetchedAt"
  ) {
    return value;
  }
  return "createdAt";
}

export function formatSavedKeywordNumber(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat().format(value);
}

export function formatSavedKeywordDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

/** Saved rows store intent as free text, so it is narrowed on read. */
export function normalizeSavedKeywordIntent(
  value: string | null,
): KeywordIntent {
  switch (value) {
    case "informational":
    case "commercial":
    case "transactional":
    case "navigational":
    case "unknown":
      return value;
    default:
      return "unknown";
  }
}

/**
 * Saved keywords carry the same metrics the research dashboard summarizes,
 * under different field names. Mapping here keeps one analytics implementation
 * rather than a second shape inside it.
 */
export function toKeywordAnalyticsRows(
  rows: SavedKeywordRow[],
): KeywordAnalyticsRow[] {
  return rows.map((row) => ({
    keyword: row.keyword,
    searchVolume: row.searchVolume,
    trend: row.monthlySearches,
    keywordDifficulty: row.keywordDifficulty,
    cpc: row.cpc,
    intent: normalizeSavedKeywordIntent(row.intent),
  }));
}
