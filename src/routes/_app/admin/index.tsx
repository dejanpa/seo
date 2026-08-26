import * as React from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import {
  useAdminOverview,
  useAdminWorkspaces,
} from "@/client/features/admin/queries";
import {
  formatCredits,
  formatCreditsAsUsd,
  formatDate,
} from "@/client/features/admin/format";
import { LocalBillingNotice } from "@/client/features/admin/LocalBillingNotice";

export const Route = createFileRoute("/_app/admin/")({
  component: AdminWorkspacesPage,
});

function AdminWorkspacesPage() {
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const overview = useAdminOverview();
  const workspaces = useAdminWorkspaces(search, page);
  const data = workspaces.data;
  const pageCount = data
    ? Math.max(Math.ceil(data.total / data.pageSize), 1)
    : 1;

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {overview.data && !overview.data.localBilling ? (
        <LocalBillingNotice />
      ) : null}

      <form onSubmit={submitSearch} className="flex gap-2">
        <label className="input input-bordered input-sm flex flex-1 items-center gap-2">
          <Search className="size-4 shrink-0 opacity-60" />
          <input
            type="search"
            className="grow"
            placeholder="Search by email, name or workspace"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-sm btn-primary">
          Search
        </button>
      </form>

      {workspaces.isLoading ? (
        <div className="flex justify-center py-10">
          <span className="loading loading-spinner loading-md" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>User</th>
                <th>Workspace</th>
                <th>Plan</th>
                <th className="text-right">Credits left</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((row) => (
                <tr key={row.organizationId} className="hover">
                  <td>
                    <Link
                      to="/admin/$organizationId"
                      params={{ organizationId: row.organizationId }}
                      className="flex flex-col"
                    >
                      <span className="font-medium" data-ph-mask>
                        {row.userEmail ?? "No account linked"}
                      </span>
                      <span className="text-xs text-base-content/60">
                        {row.userName ?? row.organizationSlug}
                        {row.isAdmin ? " · admin" : ""}
                        {row.userId && !row.emailVerified
                          ? " · unverified"
                          : ""}
                      </span>
                    </Link>
                  </td>
                  <td className="text-sm">{row.organizationName}</td>
                  <td className="text-sm">{row.planName ?? "—"}</td>
                  <td className="text-right text-sm tabular-nums">
                    {formatCredits(row.creditsRemaining)}
                    <span className="ml-1 text-xs text-base-content/50">
                      {formatCreditsAsUsd(row.creditsRemaining)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge badge-sm ${
                        row.banned
                          ? "badge-error"
                          : row.status === "suspended"
                            ? "badge-warning"
                            : "badge-ghost"
                      }`}
                    >
                      {row.banned
                        ? "banned"
                        : (row.status ?? "no subscription")}
                    </span>
                  </td>
                  <td className="text-sm">
                    {formatDate(row.organizationCreatedAt)}
                  </td>
                </tr>
              ))}
              {data && data.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-sm text-base-content/60"
                  >
                    No workspaces match that search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > data.pageSize ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-base-content/60">
            {data.total} workspaces · page {data.page} of {pageCount}
          </span>
          <div className="join">
            <button
              type="button"
              className="btn btn-sm join-item"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-sm join-item"
              disabled={page >= pageCount}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
