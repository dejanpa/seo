import { ArrowDownRight, ArrowUpRight, Plus, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
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
    tone: "text-destructive",
    bar: "bg-destructive/60",
  },
  {
    key: "lost",
    label: "Lost",
    icon: X,
    tone: "text-destructive",
    bar: "bg-destructive",
  },
];

/** Semrush-style position changes: what moved since DataForSEO's last check. */
export function DomainMovementCard({ movement }: { movement: DomainMovement }) {
  const total = ROWS.reduce((sum, row) => sum + movement[row.key], 0);
  const net = movement.new + movement.up - movement.down - movement.lost;
  const netTone =
    net > 0
      ? "text-success"
      : net < 0
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h3>Position changes</h3>
        </CardTitle>
        <CardAction className={`text-xs tabular-nums ${netTone}`}>
          {net > 0 ? "+" : ""}
          {formatRounded(net)} net
        </CardAction>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No movement recorded since the last check.
          </p>
        ) : (
          <div className="space-y-3">
            {ROWS.map((row) => {
              const value = movement[row.key];
              return (
                <div key={row.key} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <row.icon className={`size-3.5 ${row.tone}`} />
                      {row.label}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatRounded(value)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className={`h-1.5 rounded-full ${row.bar}`}
                      style={{ width: `${(value / total) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
