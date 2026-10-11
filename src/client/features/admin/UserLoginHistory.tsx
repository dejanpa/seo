import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { formatDateTime } from "@/client/features/admin/format";

type LoginEvent = {
  id: string;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
};

/** One row per successful sign-in, newest first. Recorded from the Better Auth
 *  session hook, so it survives sign-out and session expiry. */
export function UserLoginHistory({ events }: { events: LoginEvent[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Sign-in history</h2>
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Device</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="whitespace-nowrap">
                  {formatDateTime(event.createdAt)}
                </TableCell>
                <TableCell className="font-mono text-xs" data-ph-mask>
                  {event.ipAddress ?? "—"}
                </TableCell>
                <TableCell
                  className="max-w-md truncate text-xs text-muted-foreground"
                  title={event.userAgent ?? undefined}
                >
                  {event.userAgent ?? "—"}
                </TableCell>
              </TableRow>
            ))}
            {events.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-6 text-center text-muted-foreground"
                >
                  No sign-ins recorded yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableCard>
    </section>
  );
}
