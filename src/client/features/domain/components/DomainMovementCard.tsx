import { ArrowDownRight, ArrowUpRight, Plus, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DomainMovement } from "@/client/features/domain/types";
import { formatRounded } from "@/client/features/domain/utils";

const ROWS: Array<{
  key: keyof DomainMovement;
  label: string;
  icon: LucideIcon;
  tone: string;
  bar: string;
}> = [
  {
    key: "new",
    label: "New",
    icon: Plus,
    tone: "text-success",
    bar: "bg-success",
  },
  {
    key: "up",
    label: "Improved",
    icon: ArrowUpRight,
    tone: "text-success",
    bar: "bg-success/60",
  },
  {
    key: "down",
    label: "Declined",
    icon: ArrowDownRight,
    tone: "text-error",
    bar: "bg-error/60",
  },
  { key: "lost", label: "Lost", icon: X, tone: "text-error", bar: "bg-error" },
];

/** Semrush-style position changes: what moved since DataForSEO's last check. */
export function DomainMovementCard({ movement }: { movement: DomainMovement }) {
  const total = ROWS.reduce((sum, row) => sum + movement[row.key], 0);
  const net = movement.new + movement.up - movement.down - movement.lost;

  return (
    <section className="rounded-xl border border-base-300 bg-base-100 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">Position changes</h2>
        <span
          className={`text-xs tabular-nums ${net > 0 ? "text-success" : net < 0 ? "text-error" : "text-base-content/50"}`}
        >
          {net > 0 ? "+" : ""}
          {formatRounded(net)} net
        </span>
      </div>

      {total === 0 ? (
        <p className="py-10 text-center text-sm text-base-content/55">
          No movement recorded since the last check.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {ROWS.map((row) => {
            const value = movement[row.key];
            const width = total > 0 ? (value / total) * 100 : 0;
            return (
              <div key={row.key} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 text-base-content/70">
                    <row.icon className={`size-3.5 ${row.tone}`} />
                    {row.label}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatRounded(value)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-base-200">
                  <div
                    className={`h-1.5 rounded-full ${row.bar}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
