import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { KeywordDashboard } from "@/client/features/keywords/components";
import { exportSavedKeywords } from "@/serverFunctions/keywords";
import type { ExportSavedKeywordsInput } from "@/types/schemas/keywords";
import { toKeywordAnalyticsRows } from "./savedKeywordsUtils";

/**
 * The same overview the research page draws, over the whole saved set.
 *
 * The table below is paginated on the server, so summarizing the rows on
 * screen would describe one page and call it a portfolio. This reads every row
 * matching the current filters instead — the identical read the CSV export
 * already performs — and only when the user opens it, because on a large
 * project that payload is not free.
 */
export function SavedKeywordsOverview({
  input,
}: {
  input: ExportSavedKeywordsInput;
}) {
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: ["savedKeywordsOverview", input],
    queryFn: () => exportSavedKeywords({ data: input }),
    enabled: open,
  });

  const rows = useMemo(
    () => toKeywordAnalyticsRows(query.data?.rows ?? []),
    [query.data],
  );

  return (
    <KeywordDashboard
      rows={rows}
      open={open}
      onOpenChange={setOpen}
      label="Portfolio overview"
      loading={open && query.isLoading}
    />
  );
}
