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
    <section className="rounded-lg border border-base-300 p-4">
      <h2 className="mb-3 font-semibold">Credit history</h2>
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>When</th>
              <th>Kind</th>
              <th>Feature</th>
              <th className="text-right">Credits</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="whitespace-nowrap">
                  {formatDate(entry.createdAt)}
                </td>
                <td>{entry.kind.replace(/_/g, " ")}</td>
                <td>
                  {entry.creditFeature
                    ? creditFeatureLabel(entry.creditFeature)
                    : "\u2014"}
                </td>
                <td
                  className={`text-right tabular-nums ${
                    entry.creditsDelta < 0 ? "text-error" : "text-success"
                  }`}
                >
                  {entry.creditsDelta > 0 ? "+" : ""}
                  {formatCredits(entry.creditsDelta)}
                </td>
                <td className="text-base-content/60">
                  {entry.note ?? "\u2014"}
                </td>
              </tr>
            ))}
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-6 text-center text-base-content/60"
                >
                  Nothing recorded yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
