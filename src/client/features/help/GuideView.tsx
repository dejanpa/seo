import type { ReactNode } from "react";
import { Badge } from "@/client/components/ui/badge";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { isHostedClientAuthMode } from "@/lib/auth-mode";

type PageCard = { name: string; cost: boolean; body: string; input: string };

/**
 * Everything the guide says, in one language. The English guide (Help &
 * Support) and its Serbian original (/help) share this shape and GuideView, so
 * a layout change lands in both and only the words differ.
 */
export type GuideContent = {
  costLabels: { paid: string; free: string };
  organization: {
    title: string;
    intro: ReactNode;
    menuIntro: ReactNode;
    columns: [string, string, string];
    rows: { group: string; scope: string; pages: string }[];
  };
  steps: {
    title: string;
    intro: string;
    items: { title: string; body: ReactNode }[];
  };
  pages: {
    title: string;
    legend: (badges: { paid: ReactNode; free: ReactNode }) => ReactNode;
    groups: { label: string; cards: PageCard[] }[];
  };
  selfHost: {
    trapsTitle: string;
    traps: { title: ReactNode; body: ReactNode }[];
    commandsTitle: string;
    commandsIntro: ReactNode;
    commands: string;
  };
};

const PROSE = "text-sm leading-relaxed text-foreground/80";

export function GuideView({ content }: { content: GuideContent }) {
  // Docker/OAuth gotchas and terminal commands only apply to a self-hosted
  // container; on the hosted service they would be actively misleading.
  const isSelfHosted = !isHostedClientAuthMode();
  const { organization, steps, pages, selfHost } = content;
  const costBadge = (cost: boolean) =>
    cost ? (
      <Badge variant="warning" className="shrink-0">
        {content.costLabels.paid}
      </Badge>
    ) : (
      <Badge variant="success" className="shrink-0">
        {content.costLabels.free}
      </Badge>
    );

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{organization.title}</h2>
        <p className={PROSE}>{organization.intro}</p>
        <p className={PROSE}>{organization.menuIntro}</p>
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                {organization.columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {organization.rows.map((row) => (
                <TableRow key={row.group}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {row.group}
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {row.scope}
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {row.pages}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{steps.title}</h2>
        <p className={PROSE}>{steps.intro}</p>
        <ol className="space-y-3">
          {steps.items.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-3 rounded-lg border border-border p-4"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <div className="space-y-1">
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{pages.title}</h2>
        <p className={PROSE}>
          {pages.legend({ paid: costBadge(true), free: costBadge(false) })}
        </p>
        {pages.groups.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {group.label}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.cards.map((card) => (
                <div
                  key={card.name}
                  className="space-y-1.5 rounded-lg border border-border p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{card.name}</h3>
                    {costBadge(card.cost)}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {card.body}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {card.input}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {isSelfHosted ? (
        <>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{selfHost.trapsTitle}</h2>
            <div className="space-y-3">
              {selfHost.traps.map((trap, index) => (
                <div
                  key={index}
                  className="space-y-1 rounded-lg border-l-2 border-warning bg-muted/40 p-4"
                >
                  <h3 className="font-semibold">{trap.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {trap.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{selfHost.commandsTitle}</h2>
            <p className={PROSE}>{selfHost.commandsIntro}</p>
            <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 text-xs leading-relaxed">
              <code>{selfHost.commands}</code>
            </pre>
          </section>
        </>
      ) : null}
    </div>
  );
}
