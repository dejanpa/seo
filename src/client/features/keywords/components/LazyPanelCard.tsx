import { ChevronDown, ChevronUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { LazyKeywordPanel } from "../hooks/useLazyKeywordPanel";

/**
 * The shell every paid side panel shares: a header that toggles, a line that
 * says what opening it costs, and the loading / error / empty states.
 *
 * The closed hint is the whole point of the pattern — the user should know a
 * lookup is about to be spent before they click, not after.
 */
export function LazyPanelCard<T>({
  icon: Icon,
  title,
  keyword,
  panel,
  closedHint,
  openHint,
  emptyLabel,
  children,
}: {
  icon: LucideIcon;
  title: string;
  keyword: string | null;
  panel: LazyKeywordPanel<T>;
  closedHint: string;
  openHint: string;
  emptyLabel: string;
  /** Returns null when the payload arrived but holds nothing worth drawing. */
  children: (data: T) => ReactNode;
}) {
  return (
    <div
      className="shrink-0 overflow-hidden rounded-xl border border-base-300 bg-base-100 px-4 py-3"
      // A closed panel is a button and a price on paper — nothing a reader of
      // the printed report can act on.
      data-print-hide={panel.open ? undefined : true}
    >
      <button
        type="button"
        className="flex w-full items-center gap-1.5 text-left text-sm font-semibold disabled:opacity-50"
        aria-expanded={panel.open}
        disabled={!keyword}
        onClick={() => panel.setOpen(!panel.open)}
      >
        <Icon className="size-3.5 shrink-0" />
        {title}
        {keyword ? (
          <span className="truncate font-normal text-base-content/50">
            : {keyword}
          </span>
        ) : null}
        <span className="flex-1" />
        {panel.open ? (
          <ChevronUp className="size-4 shrink-0 opacity-60" />
        ) : (
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        )}
      </button>
      <p className="text-xs text-base-content/55">
        {panel.open ? openHint : closedHint}
      </p>
      {panel.open ? (
        <Body panel={panel} emptyLabel={emptyLabel}>
          {children}
        </Body>
      ) : null}
    </div>
  );
}

function Body<T>({
  panel,
  emptyLabel,
  children,
}: {
  panel: LazyKeywordPanel<T>;
  emptyLabel: string;
  children: (data: T) => ReactNode;
}) {
  if (panel.loading) {
    return (
      <div className="mt-3 h-44 animate-pulse rounded-lg bg-base-200/60" />
    );
  }

  if (panel.error) {
    return (
      <div className="mt-3 flex flex-col items-start gap-2 py-6">
        <p className="text-sm text-base-content/70">{panel.error}</p>
        <button className="btn btn-xs" onClick={panel.retry}>
          Try again
        </button>
      </div>
    );
  }

  const body = panel.data === null ? null : children(panel.data);
  if (!body) {
    return (
      <p className="py-10 text-center text-sm text-base-content/55">
        {emptyLabel}
      </p>
    );
  }

  return <>{body}</>;
}
