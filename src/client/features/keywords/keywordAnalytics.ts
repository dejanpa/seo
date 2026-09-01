import { median } from "remeda";
import type { KeywordIntent, MonthlySearch } from "@/types/keywords";

/**
 * Everything the keyword dashboard draws, computed once from the rows the
 * table is already showing.
 *
 * Pure on purpose: the charts are lazily loaded, so keeping the maths out of
 * them means it can be verified without a browser and the numbers in the tiles
 * can never disagree with the numbers in the charts.
 */

/**
 * The fields the dashboard reads. Narrower than KeywordResearchRow on purpose,
 * so saved keywords — same metrics, different field names — can be mapped onto
 * it instead of the analytics growing a second shape.
 */
export type KeywordAnalyticsRow = {
  keyword: string;
  searchVolume: number | null;
  trend: MonthlySearch[];
  keywordDifficulty: number | null;
  cpc: number | null;
  intent: KeywordIntent;
};

export type MonthPoint = {
  /** `2026-05`, sortable and stable across locales. */
  key: string;
  label: string;
  volume: number;
  /** How many keywords reported a figure for this month. */
  coverage: number;
};

export type RankedKeyword = {
  keyword: string;
  volume: number;
  /** 0-100 bar length. */
  share: number;
  difficulty: number | null;
};

export type IntentSlice = { intent: KeywordIntent; value: number };

export type DifficultyBand = { name: string; value: number };

export type ScatterPoint = {
  keyword: string;
  difficulty: number;
  volume: number;
  cpc: number;
  intent: KeywordIntent;
};

export type KeywordAnalytics = {
  count: number;
  totalVolume: number;
  medianVolume: number | null;
  medianCpc: number | null;
  medianDifficulty: number | null;
  /** Keywords whose most recent month beat the one before it. */
  rising: number;
  falling: number;
  /** Keywords with enough history to have a direction at all. */
  trendCoverage: number;
  /** Full-coverage months only. See {@link splitByCoverage} for why. */
  monthly: MonthPoint[];
  /** Months dropped because too few keywords reported them. */
  partialMonths: number;
  /** Aggregate change across the whole set, in percent. */
  aggregateTrend: {
    monthly: number | null;
    quarterly: number | null;
    yearly: number | null;
  };
  intentSplit: IntentSlice[];
  difficultyBands: DifficultyBand[];
  topByVolume: RankedKeyword[];
  easiestWins: RankedKeyword[];
  scatter: ScatterPoint[];
};

/**
 * Half-open bands, so nothing can fall between them. Inclusive integer ranges
 * (0-19, 20-39, ...) silently drop any difficulty that is not a whole number:
 * 19.5 would match no band and vanish from the donut, and because the donut
 * normalizes against the surviving total the loss would be invisible.
 */
const DIFFICULTY_BANDS: Array<{ name: string; min: number }> = [
  { name: "Very easy", min: 0 },
  { name: "Easy", min: 20 },
  { name: "Medium", min: 40 },
  { name: "Hard", min: 60 },
  { name: "Very hard", min: 80 },
];

const RANKED_LIMIT = 8;

const MONTH_LABEL = new Intl.DateTimeFormat(undefined, {
  month: "short",
  timeZone: "UTC",
});

export function computeKeywordAnalytics(
  rows: KeywordAnalyticsRow[],
): KeywordAnalytics {
  const volumes = rows
    .map((row) => row.searchVolume)
    .filter((value): value is number => value !== null);
  const cpcs = rows
    .map((row) => row.cpc)
    .filter((value): value is number => value !== null && value > 0);
  const difficulties = rows
    .map((row) => row.keywordDifficulty)
    .filter((value): value is number => value !== null);

  const allMonths = aggregateMonthly(rows);
  const reliable = splitByCoverage(allMonths);
  const directions = rows.map(monthOverMonthDirection);

  return {
    count: rows.length,
    totalVolume: volumes.reduce((sum, value) => sum + value, 0),
    medianVolume: median(volumes) ?? null,
    medianCpc: median(cpcs) ?? null,
    medianDifficulty: median(difficulties) ?? null,
    rising: directions.filter((value) => value === "rising").length,
    falling: directions.filter((value) => value === "falling").length,
    trendCoverage: directions.filter((value) => value !== null).length,
    monthly: reliable,
    partialMonths: allMonths.length - reliable.length,
    aggregateTrend: {
      monthly: windowChange(reliable, allMonths, 1),
      quarterly: windowChange(reliable, allMonths, 3),
      yearly: windowChange(reliable, allMonths, 12),
    },
    intentSplit: intentSplit(rows),
    difficultyBands: difficultyBands(rows),
    topByVolume: topByVolume(rows),
    easiestWins: easiestWins(rows),
    scatter: scatterPoints(rows),
  };
}

/**
 * Total searches per calendar month across every keyword in the set.
 *
 * Series lengths differ per keyword, so months are keyed by date rather than
 * by index and `coverage` records how many keywords actually reported each
 * one. Without that, a month only two keywords cover looks like a cliff.
 */
function aggregateMonthly(rows: KeywordAnalyticsRow[]): MonthPoint[] {
  const totals = new Map<
    string,
    { volume: number; coverage: number; year: number; month: number }
  >();

  for (const row of rows) {
    for (const point of row.trend) {
      // The mapper defaults a missing year or month to 0, which would key a
      // bogus bucket and label as month -1.
      if (point.month < 1 || point.month > 12 || point.year < 1970) continue;

      const key = monthKey(point.year, point.month);
      const entry = totals.get(key) ?? {
        volume: 0,
        coverage: 0,
        year: point.year,
        month: point.month,
      };
      entry.volume += point.searchVolume;
      entry.coverage += 1;
      totals.set(key, entry);
    }
  }

  return [...totals.entries()]
    .toSorted((a, b) => a[0].localeCompare(b[0]))
    .map(([key, entry]) => ({
      key,
      label: `${MONTH_LABEL.format(Date.UTC(entry.year, entry.month - 1, 1))} ${String(entry.year).slice(2)}`,
      volume: entry.volume,
      coverage: entry.coverage,
    }));
}

/**
 * Keep only the months enough keywords actually reported.
 *
 * Per-keyword series are not aligned: the middle months are typically reported
 * by the whole set while the first and last are reported by a third of it.
 * Summing them raw draws a cliff at both ends and produces a month-over-month
 * fall that is entirely an artifact of who reported, not of demand.
 */
function splitByCoverage(months: MonthPoint[]): MonthPoint[] {
  if (months.length === 0) return months;
  const maxCoverage = Math.max(...months.map((point) => point.coverage));
  // Rounded up, not down: with two keywords reporting, `floor(2 * 0.9)` is 1,
  // so a month only half the set covered would pass as reliable.
  const threshold = Math.max(1, Math.ceil(maxCoverage * 0.9));
  return months.filter((point) => point.coverage >= threshold);
}

/**
 * Compare the most recent `size` months against the `size` before them.
 *
 * Deliberately not an average of the per-keyword percentages: averaging those
 * weights a keyword with 10 searches the same as one with 9 million. Summed
 * volume answers the question actually being asked, which is whether this
 * topic is growing.
 *
 * The window is taken from the full month list with each month checked for
 * reliability individually, because the coverage-filtered plateau is often
 * only twelve months and a year-over-year comparison needs twenty-four. Every
 * month in both windows must be present, reliable, and consecutive — comparing
 * the last two surviving entries across a gap and calling it month-over-month
 * is simply a wrong number.
 */
function windowChange(
  reliable: MonthPoint[],
  all: MonthPoint[],
  size: number,
): number | null {
  if (reliable.length === 0) return null;

  const reliableKeys = new Set(reliable.map((point) => point.key));
  const byKey = new Map(all.map((point) => [point.key, point]));

  // Anchor on the newest month everyone reported, not the newest month present.
  const anchor = reliable[reliable.length - 1].key;
  const keys: string[] = [];
  for (let back = 0; back < size * 2; back += 1) {
    const key = shiftMonth(anchor, -back);
    if (!byKey.has(key) || !reliableKeys.has(key)) return null;
    keys.push(key);
  }

  const sum = (slice: string[]) =>
    slice.reduce((total, key) => total + (byKey.get(key)?.volume ?? 0), 0);

  // keys[0] is the anchor and the list runs backwards.
  const current = sum(keys.slice(0, size));
  const previous = sum(keys.slice(size));
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** `2026-05` shifted by a signed number of calendar months. */
function shiftMonth(key: string, delta: number): string {
  const [yearPart, monthPart] = key.split("-");
  const zeroBased = Number(yearPart) * 12 + (Number(monthPart) - 1) + delta;
  return monthKey(Math.floor(zeroBased / 12), (zeroBased % 12) + 1);
}

/** Whether a keyword's own latest month beat the one before it. */
function monthOverMonthDirection(
  row: KeywordAnalyticsRow,
): "rising" | "falling" | null {
  const sorted = row.trend.toSorted(
    (a, b) => a.year * 100 + a.month - (b.year * 100 + b.month),
  );
  const latest = sorted.at(-1);
  const previous = sorted.at(-2);
  if (!latest || !previous || previous.searchVolume === 0) return null;
  if (latest.searchVolume === previous.searchVolume) return null;
  return latest.searchVolume > previous.searchVolume ? "rising" : "falling";
}

function intentSplit(rows: KeywordAnalyticsRow[]): IntentSlice[] {
  const counts = new Map<KeywordIntent, number>();
  for (const row of rows) {
    counts.set(row.intent, (counts.get(row.intent) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([intent, value]) => ({ intent, value }))
    .toSorted((a, b) => b.value - a.value);
}

function difficultyBands(rows: KeywordAnalyticsRow[]): DifficultyBand[] {
  const counts = DIFFICULTY_BANDS.map(() => 0);

  for (const row of rows) {
    if (row.keywordDifficulty === null) continue;
    // Clamped, then matched on the last band whose floor it clears, so a
    // fractional or out-of-range score still lands somewhere.
    const clamped = Math.min(100, Math.max(0, row.keywordDifficulty));
    let index = 0;
    for (const [i, band] of DIFFICULTY_BANDS.entries()) {
      if (clamped >= band.min) index = i;
    }
    counts[index] += 1;
  }

  return DIFFICULTY_BANDS.map((band, index) => ({
    name: band.name,
    value: counts[index],
  })).filter((band) => band.value > 0);
}

function topByVolume(rows: KeywordAnalyticsRow[]): RankedKeyword[] {
  const ranked = rows
    .filter((row) => (row.searchVolume ?? 0) > 0)
    .toSorted((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
    .slice(0, RANKED_LIMIT);

  const max = ranked[0]?.searchVolume ?? 1;
  return ranked.map((row) => ({
    keyword: row.keyword,
    volume: row.searchVolume ?? 0,
    share: ((row.searchVolume ?? 0) / max) * 100,
    difficulty: row.keywordDifficulty,
  }));
}

/**
 * High volume for low difficulty: the actual decision this panel exists to
 * support. Scored rather than sorted on one axis, so a 90-difficulty giant
 * cannot crowd out a genuinely winnable term.
 */
function easiestWins(rows: KeywordAnalyticsRow[]): RankedKeyword[] {
  return rows
    .flatMap((row) => {
      const volume = row.searchVolume ?? 0;
      const difficulty = row.keywordDifficulty;
      if (volume <= 0 || difficulty === null) return [];
      // Log volume keeps a 9M head term from dominating purely on scale.
      const score = Math.log10(volume + 1) * (100 - difficulty);
      return [{ row, score, volume, difficulty }];
    })
    .toSorted((a, b) => b.score - a.score)
    .slice(0, RANKED_LIMIT)
    .map((entry) => ({
      keyword: entry.row.keyword,
      volume: entry.volume,
      // The bar shows ease rather than the score, so the bar and the "KD 16"
      // beside it say the same thing. A score-length bar next to a volume
      // figure reads as a contradiction: an 18K keyword would draw a longer
      // bar than a 33K one with no visible reason.
      share: 100 - entry.difficulty,
      difficulty: entry.difficulty,
    }));
}

function scatterPoints(rows: KeywordAnalyticsRow[]): ScatterPoint[] {
  return rows.flatMap((row) => {
    if (row.keywordDifficulty === null || (row.searchVolume ?? 0) <= 0) {
      return [];
    }
    return [
      {
        keyword: row.keyword,
        difficulty: row.keywordDifficulty,
        volume: row.searchVolume ?? 0,
        cpc: row.cpc ?? 0,
        intent: row.intent,
      },
    ];
  });
}
