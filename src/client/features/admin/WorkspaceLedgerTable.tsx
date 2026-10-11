import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { formatCredits, formatDate } from "@/client/features/admin/format";
import { creditFeatureLabel } from "@/shared/billing-credit-features";

type LedgerEntry = {
  id: string;
  createdAt: string;
  kind: string;
  creditFeature: string | null;
  creditsDelta: number;
  note: string | null;
};

/** Append-only record of every credit movement on a workspace: the period
 *  grants, what each feature burned, and any operator adjustment. */
export function WorkspaceLedgerTable({ entries }: { entries: LedgerEntry[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Credit history</h2>
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Feature</TableHead>
              <TableHead className="text-right">Credits</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap">
                  {formatDate(entry.createdAt)}
                </TableCell>
                <TableCell>{entry.kind.replace(/_/g, " ")}</TableCell>
                <TableCell>
                  {entry.creditFeature
                    ? creditFeatureLabel(entry.creditFeature)
                    : "\u2014"}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${
                    entry.creditsDelta < 0 ? "text-destructive" : "text-success"
                  }`}
                >
                  {entry.creditsDelta > 0 ? "+" : ""}
                  {formatCredits(entry.creditsDelta)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {entry.note ?? "\u2014"}
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-6 text-center text-muted-foreground"
                >
                  Nothing recorded yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableCard>
    </section>
  );
}
