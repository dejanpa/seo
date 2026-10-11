import { Bar, BarChart, Cell, LabelList } from "recharts";
import { ChartXAxis } from "@/client/components/ChartAxes";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/client/components/ui/chart";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import type { DomainPositions } from "@/client/features/domain/types";
import { formatRounded } from "@/client/features/domain/utils";

const BUCKETS = [
  { key: "top3", label: "Top 3", opacity: 1 },
  { key: "pos4to10", label: "4-10", opacity: 0.8 },
  { key: "pos11to20", label: "11-20", opacity: 0.6 },
  { key: "pos21to50", label: "21-50", opacity: 0.42 },
  { key: "pos51to100", label: "51-100", opacity: 0.28 },
] as const;

const chartConfig = {
  keywords: { label: "Keywords", color: "var(--primary)" },
} satisfies ChartConfig;

/** Where the domain's keywords actually sit in the SERP — the shape of the
 * profile matters more than the total keyword count. */
export function DomainPositionsCard({
  positions,
}: {
  positions: DomainPositions;
}) {
  const total = BUCKETS.reduce((sum, bucket) => sum + positions[bucket.key], 0);
  const rows = BUCKETS.map((bucket) => ({
    label: bucket.label,
    keywords: positions[bucket.key],
    share: total > 0 ? Math.round((positions[bucket.key] / total) * 100) : 0,
    opacity: bucket.opacity,
  }));

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h3>Keywords by position</h3>
        </CardTitle>
        <CardAction className="text-xs text-muted-foreground tabular-nums">
          {formatRounded(total)} ranked
        </CardAction>
        {total > 0 ? (
          <CardDescription>
            {rows[0].share}% of rankings are in the top 3, the only positions
            that pull real traffic.
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No ranking positions for this domain yet.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-44">
            <BarChart data={rows} margin={{ top: 16, right: 0, left: 0 }}>
              <ChartXAxis dataKey="label" minTickGap={0} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    valueFormatter={(value) =>
                      `${formatRounded(Number(value))} keywords`
                    }
                  />
                }
              />
              <Bar dataKey="keywords" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="keywords"
                  position="top"
                  className="fill-foreground"
                  fontSize={11}
                />
                {rows.map((row) => (
                  <Cell
                    key={row.label}
                    fill="var(--color-keywords)"
                    fillOpacity={row.opacity}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
