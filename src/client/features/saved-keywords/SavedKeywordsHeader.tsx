import { useState } from "react";
import { Printer, RefreshCw } from "lucide-react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { ExportMenu } from "@/client/components/ExportMenu";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";

export function SavedKeywordsHeader({
  totalCount,
  exporting,
  metricsRefreshing,
  onExportCsv,
  onExportSheets,
  onRefreshMetrics,
}: {
  totalCount: number;
  exporting: "csv" | "sheets" | null;
  metricsRefreshing: boolean;
  onExportCsv: () => void;
  onExportSheets: () => void;
  onRefreshMetrics: () => void;
}) {
  const [confirmingRefresh, setConfirmingRefresh] = useState(false);
  const disabled = totalCount === 0 || exporting != null;

  return (
    <>
      <PageHeader
        title="Saved Keywords"
        description="Save keyword ideas from research, organize them with tags, and revisit when you're ready to act."
        actions={
          // Fork: on-screen controls stay off the printed report.
          <div data-print-hide className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              title="Fetch new volume, difficulty, and CPC"
              disabled={disabled || metricsRefreshing}
              onClick={() => setConfirmingRefresh(true)}
            >
              <RefreshCw
                data-icon="inline-start"
                className={metricsRefreshing ? "animate-spin" : ""}
              />
              {metricsRefreshing ? "Updating..." : "Update keyword stats"}
            </Button>

            <ExportMenu
              actions={["sheets", "csv"]}
              busy={exporting != null}
              disabled={disabled}
              onExport={(action) =>
                action === "sheets" ? onExportSheets() : onExportCsv()
              }
            />

            {/* The browser's print dialog is the PDF writer, so Serbian
                keywords keep their page fonts. */}
            <Button
              variant="outline"
              size="sm"
              disabled={totalCount === 0}
              onClick={() => window.print()}
            >
              <Printer data-icon="inline-start" />
              Save as PDF
            </Button>
          </div>
        }
      />

      {confirmingRefresh ? (
        <ConfirmDialog
          title="Update keyword stats?"
          confirmLabel="Update stats"
          onConfirm={() => {
            setConfirmingRefresh(false);
            onRefreshMetrics();
          }}
          onClose={() => setConfirmingRefresh(false)}
        >
          This fetches new volume, difficulty, and CPC for every saved keyword
          in this project. Each keyword uses credits.
        </ConfirmDialog>
      ) : null}
    </>
  );
}
