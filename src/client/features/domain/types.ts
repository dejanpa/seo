import type { ResearchScope } from "@/shared/researchScope";

export type KeywordRow = {
  keyword: string;
  position: number | null;
  searchVolume: number | null;
  traffic: number | null;
  cpc: number | null;
  url: string | null;
  relativeUrl: string | null;
  keywordDifficulty: number | null;
};

export type PageRow = {
  page: string;
  relativePath: string | null;
  organicTraffic: number | null;
  keywords: number | null;
};

export type DomainFilterValues = {
  include: string;
  exclude: string;
  minTraffic: string;
  maxTraffic: string;
  minVol: string;
  maxVol: string;
  minCpc: string;
  maxCpc: string;
  minKd: string;
  maxKd: string;
  minRank: string;
  maxRank: string;
};

export const EMPTY_DOMAIN_FILTERS: DomainFilterValues = {
  include: "",
  exclude: "",
  minTraffic: "",
  maxTraffic: "",
  minVol: "",
  maxVol: "",
  minCpc: "",
  maxCpc: "",
  minKd: "",
  maxKd: "",
  minRank: "",
  maxRank: "",
};

export type KeywordsFilterValues = DomainFilterValues;

export type PagesFilterValues = Pick<
  DomainFilterValues,
  "include" | "exclude" | "minTraffic" | "maxTraffic" | "minVol" | "maxVol"
>;

export type PageFilterKey = keyof PagesFilterValues;

export type DomainControlsValues = {
  domain: string;
  scope: ResearchScope;
  sort: "rank" | "traffic" | "volume" | "score" | "cpc";
  locationCode: number;
};

export type DomainSortMode = DomainControlsValues["sort"];
export type SortOrder = "asc" | "desc";
export type DomainActiveTab = "keywords" | "pages";

export type DomainHistoryItem = {
  timestamp: number;
  domain: string;
  scope: ResearchScope;
  sort: DomainSortMode;
  tab: DomainActiveTab;
  search?: string;
  locationCode?: number;
};

export type DomainPositions = {
  top3: number;
  pos4to10: number;
  pos11to20: number;
  pos21to50: number;
  pos51to100: number;
};

export type DomainMovement = {
  new: number;
  up: number;
  down: number;
  lost: number;
};

/** The overview fields the header cards render, structurally matched by the
 * server function's return type. */
export type DomainOverviewMetrics = {
  organicTraffic: number | null;
  organicKeywords: number | null;
  trafficValue?: number | null;
  positions?: DomainPositions | null;
  movement?: DomainMovement | null;
  paidKeywords?: number | null;
  paidTraffic?: number | null;
  hasData: boolean;
};
