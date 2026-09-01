export type KeywordIntent =
  | "informational"
  | "commercial"
  | "transactional"
  | "navigational"
  | "unknown";

export type MonthlySearch = {
  year: number;
  month: number;
  searchVolume: number;
};

export type TrendsInterestPoint = {
  /** `2026-05-01`, the start of the bucket. */
  date: string;
  /** 0-100, where 100 is the peak of the requested range. */
  value: number;
};

export type TrendsRelatedQuery = { query: string; value: number };

/** Google Trends for one keyword: relative interest (attention, not counts)
 * plus the queries rising around it. */
export type GoogleTrendsData = {
  interest: TrendsInterestPoint[];
  topQueries: TrendsRelatedQuery[];
  risingQueries: TrendsRelatedQuery[];
};

/** Relative popularity of a keyword in one subregion, 0-100. */
export type RegionInterest = { region: string; value: number };

/** One bar of an age or gender split, 0-100. */
export type DemographySplit = { label: string; value: number };

export type KeywordDemography = {
  age: DemographySplit[];
  gender: DemographySplit[];
};

/** Who is searching and where, from DataForSEO Trends. */
export type KeywordAudienceData = KeywordDemography & {
  regions: RegionInterest[];
};

export type KeywordResearchRow = {
  keyword: string;
  searchVolume: number | null;
  trend: MonthlySearch[];
  keywordDifficulty: number | null;
  cpc: number | null;
  competition: number | null;
  intent: KeywordIntent;
};

export type SavedKeywordRow = {
  id: string;
  projectId: string;
  keyword: string;
  locationCode: number;
  languageCode: string;
  createdAt: string;
  searchVolume: number | null;
  cpc: number | null;
  competition: number | null;
  keywordDifficulty: number | null;
  intent: string | null;
  monthlySearches: MonthlySearch[];
  fetchedAt: string | null;
  tags: SavedKeywordTag[];
};

export type SavedKeywordTag = {
  id: string;
  name: string;
  normalizedName: string;
  /** Palette key (e.g. "blue"). Null = derive a stable color from the id. */
  color: string | null;
};

export type SavedKeywordTagSummary = SavedKeywordTag & {
  keywordCount: number;
};

export type SerpResultItem = {
  rank: number;
  title: string;
  url: string;
  domain: string;
  description: string;
  etv: number | null;
  estimatedPaidTrafficCost: number | null;
  referringDomains: number | null;
  backlinks: number | null;
  isNew: boolean;
  rankChange: number | null;
};
