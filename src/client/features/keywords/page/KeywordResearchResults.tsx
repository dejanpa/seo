import { useState } from "react";
import { KeywordDashboard } from "@/client/features/keywords/components";
import { KeywordResearchDesktopResults } from "./KeywordResearchDesktopResults";
import { KeywordResearchMobileResults } from "./KeywordResearchMobileResults";
import type { KeywordResearchControllerState } from "./types";

type Props = {
  controller: KeywordResearchControllerState;
};

export function KeywordResearchResults({ controller }: Props) {
  const [overviewOpen, setOverviewOpen] = useState(true);

  return (
    <div className="flex-1 flex flex-col gap-4 w-full">
      {/* Reads the filtered rows, so the overview describes exactly what the
          table below it is showing. */}
      <KeywordDashboard
        rows={controller.filteredRows}
        open={overviewOpen}
        onOpenChange={setOverviewOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <KeywordResearchDesktopResults controller={controller} />
        <KeywordResearchMobileResults controller={controller} />
      </div>
    </div>
  );
}
