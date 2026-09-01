import { Sparkles } from "lucide-react";
import type { LazyKeywordPanel } from "../hooks/useLazyKeywordPanel";
import { LazyPanelCard } from "./LazyPanelCard";

type AutocompleteData = {
  suggestions: Array<{ suggestion: string; relevance: number | null }>;
};

/**
 * What Google offers to finish the query with — phrasings people are typing
 * now, which the Labs expansion endpoints can lag behind.
 */
export function KeywordAutocompleteCard({
  panel,
  keyword,
}: {
  panel: LazyKeywordPanel<AutocompleteData>;
  keyword: string | null;
}) {
  return (
    <LazyPanelCard
      icon={Sparkles}
      title="Autocomplete"
      keyword={keyword}
      panel={panel}
      closedHint="What Google suggests as people type this query. Opening this runs one lookup for this keyword."
      openHint="Google's own suggestions for this query, most relevant first."
      emptyLabel="Google returns no suggestions for this query."
    >
      {(data) =>
        data.suggestions.length === 0 ? null : (
          <ul className="mt-3 flex flex-col gap-1">
            {data.suggestions.slice(0, 20).map((entry) => (
              <li
                key={entry.suggestion}
                className="rounded-md bg-base-200/60 px-2.5 py-1 text-xs"
              >
                {entry.suggestion}
              </li>
            ))}
          </ul>
        )
      }
    </LazyPanelCard>
  );
}
