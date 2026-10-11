import { useLazyKeywordPanel } from "@/client/features/keywords/hooks/useLazyKeywordPanel";
import {
  getKeywordAudience,
  getKeywordAutocomplete,
  getKeywordHistory,
  getKeywordTrends,
} from "@/serverFunctions/keywords";

/**
 * Fork: the paid side panels under the SERP analysis. They all follow the SERP
 * panel's focused keyword, so a row click moves the whole column together, and
 * none of them spends anything until it is opened (see useLazyKeywordPanel).
 */
export function useKeywordSidePanels(
  projectId: string,
  keyword: string | null,
  locationCode: number | undefined,
) {
  const panel = <T>(
    name: string,
    fetch: (term: string) => Promise<T>,
    errorMessage: string,
  ) => ({
    queryKey: [name, projectId, keyword, locationCode],
    keyword,
    fetch,
    errorMessage,
  });
  const input = (term: string) => ({
    data: { projectId, keyword: term, locationCode },
  });

  return {
    trends: useLazyKeywordPanel(
      panel(
        "keywordTrends",
        (term) => getKeywordTrends(input(term)),
        "Failed to load Google Trends data.",
      ),
    ),
    keywordHistory: useLazyKeywordPanel(
      panel(
        "keywordHistory",
        (term) => getKeywordHistory(input(term)),
        "Failed to load keyword history.",
      ),
    ),
    audience: useLazyKeywordPanel(
      panel(
        "keywordAudience",
        (term) => getKeywordAudience(input(term)),
        "Failed to load audience data.",
      ),
    ),
    autocomplete: useLazyKeywordPanel(
      panel(
        "keywordAutocomplete",
        (term) => getKeywordAutocomplete(input(term)),
        "Failed to load autocomplete suggestions.",
      ),
    ),
  };
}
