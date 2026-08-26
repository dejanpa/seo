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
    <section className="rounded-lg border border-base-300 p-4">
      <h2 className="mb-3 font-semibold">Sign-in history</h2>
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>When</th>
              <th>IP</th>
              <th>Device</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td className="whitespace-nowrap">
                  {formatDateTime(event.createdAt)}
                </td>
                <td className="font-mono text-xs" data-ph-mask>
                  {event.ipAddress ?? "—"}
                </td>
                <td
                  className="max-w-md truncate text-xs text-base-content/60"
                  title={event.userAgent ?? undefined}
                >
                  {event.userAgent ?? "—"}
                </td>
              </tr>
            ))}
            {events.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="py-6 text-center text-base-content/60"
                >
                  No sign-ins recorded yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
