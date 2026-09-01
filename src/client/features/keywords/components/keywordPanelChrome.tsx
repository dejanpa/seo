import type { ReactNode } from "react";
import type { KeywordIntent } from "@/types/keywords";
import { INTENT_LABELS } from "./IntentBadge";

/** The card shell, tooltip shell, and color scales shared by the dashboard's
 * chart panels. */

/** Matches the semantic colors IntentBadge uses, so a dot and a badge for the
 * same intent are never different colors. */
export const INTENT_FILL: Record<KeywordIntent, string> = {
  informational: "var(--color-info)",
  commercial: "var(--color-warning)",
  transactional: "var(--color-success)",
  navigational: "var(--color-primary)",
  unknown: "var(--color-base-content)",
};

/** The score-tier ramp from app.css, which already colors difficulty badges. */
export const DIFFICULTY_FILL: Record<string, string> = {
  "Very easy": "#10b981",
  Easy: "#84cc16",
  Medium: "#eab308",
  Hard: "#f97316",
  "Very hard": "#b91c1c",
};

export const AXIS_TICK = { fill: "var(--trend-axis-color)", fontSize: 11 };

export function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-base-300 bg-base-100 p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-xs text-base-content/55">{subtitle}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function EmptyPanel({ label }: { label: string }) {
  return (
    <p className="py-16 text-center text-sm text-base-content/55">{label}</p>
  );
}

export function TooltipShell({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-base-300 bg-base-100 px-3 py-2 shadow-sm">
      {children}
    </div>
  );
}

/** Shared by both donuts: one slice's share of the whole. */
export function SliceTooltip({
  active,
  payload,
  total,
  labels,
}: {
  active?: boolean;
  payload?: Array<{ name?: string | number; value?: number }>;
  total: number;
  labels: Record<string, string>;
}) {
  if (!active || !payload?.length) return null;
  const name = String(payload[0].name);
  const value = payload[0].value ?? 0;
  return (
    <TooltipShell>
      <p className="text-sm font-medium">{labels[name] ?? name}</p>
      <p className="text-xs tabular-nums text-base-content/70">
        {value} keywords · {total > 0 ? Math.round((value / total) * 100) : 0}%
      </p>
    </TooltipShell>
  );
}

export function IntentLegend({ intents }: { intents: KeywordIntent[] }) {
  if (intents.length === 0) return null;
  return (
    <Legend
      entries={intents.map((intent) => ({
        color: INTENT_FILL[intent],
        label: INTENT_LABELS[intent],
      }))}
    />
  );
}

export function Legend({
  entries,
}: {
  entries: Array<{ color: string; label: string }>;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
      {entries.map((entry) => (
        <span
          key={entry.label}
          className="inline-flex items-center gap-1.5 text-xs text-base-content/70"
        >
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.label}
        </span>
      ))}
    </div>
  );
}
