import * as React from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Spinner } from "@/client/components/Spinner";
import { TablePagination } from "@/client/components/table/TablePagination";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/client/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
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
        <InputGroup className="flex-1">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Search by email, name or workspace"
            aria-label="Search workspaces"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </InputGroup>
        <Button type="submit">Search</Button>
      </form>

      {workspaces.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Credits left</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Signed up</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.rows.map((row) => (
                <TableRow key={row.organizationId}>
                  <TableCell>
                    <Link
                      to="/admin/$organizationId"
                      params={{ organizationId: row.organizationId }}
                      className="flex flex-col"
                    >
                      <span className="font-medium" data-ph-mask>
                        {row.userEmail ?? "No account linked"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.userName ?? row.organizationSlug}
                        {row.isAdmin ? " · admin" : ""}
                        {row.userId && !row.emailVerified
                          ? " · unverified"
                          : ""}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>{row.organizationName}</TableCell>
                  <TableCell>{row.planName ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCredits(row.creditsRemaining)}
                    <span className="ml-1 text-xs text-muted-foreground">
                      {formatCreditsAsUsd(row.creditsRemaining)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.banned
                          ? "destructive"
                          : row.status === "suspended"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {row.banned
                        ? "banned"
                        : (row.status ?? "no subscription")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDate(row.userCreatedAt ?? row.organizationCreatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      nativeButton={false}
                      render={
                        <Link
                          to="/admin/$organizationId"
                          params={{ organizationId: row.organizationId }}
                        />
                      }
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data && data.rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No workspaces match that search.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          {data && data.total > data.pageSize ? (
            <TablePagination
              page={page}
              pageSize={data.pageSize}
              totalCount={data.total}
              isLoading={workspaces.isFetching}
              onPageChange={setPage}
            />
          ) : null}
        </TableCard>
      )}
    </div>
  );
}
