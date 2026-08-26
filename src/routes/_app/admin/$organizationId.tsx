import * as React from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  adjustAdminCredits,
  assignAdminPlan,
  setAdminUserRole,
  setAdminWorkspaceStatus,
} from "@/serverFunctions/admin";
import {
  adminKeys,
  useAdminOverview,
  useAdminPlans,
  useAdminWorkspace,
} from "@/client/features/admin/queries";
import { LocalBillingNotice } from "@/client/features/admin/LocalBillingNotice";
import { WorkspaceLedgerTable } from "@/client/features/admin/WorkspaceLedgerTable";
import { UserLoginHistory } from "@/client/features/admin/UserLoginHistory";
import {
  formatCredits,
  formatCreditsAsUsd,
  formatDate,
  formatDateTime,
} from "@/client/features/admin/format";
import { planFeatureLabel } from "@/shared/plan-features";
import { getStandardErrorMessage } from "@/client/lib/error-messages";

export const Route = createFileRoute("/_app/admin/$organizationId")({
  component: AdminWorkspacePage,
});

function AdminWorkspacePage() {
  const { organizationId } = Route.useParams();
  const queryClient = useQueryClient();
  const overview = useAdminOverview();
  const detail = useAdminWorkspace(organizationId);
  const plansQuery = useAdminPlans();

  const [planId, setPlanId] = React.useState("");
  const [resetCredits, setResetCredits] = React.useState(true);
  const [monthlyDelta, setMonthlyDelta] = React.useState(0);
  const [topupDelta, setTopupDelta] = React.useState(0);
  const [note, setNote] = React.useState("");

  const workspace = detail.data?.workspace;
  const readOnly = overview.data ? !overview.data.localBilling : false;

  // Preselect whatever the workspace is already on, once the detail lands.
  React.useEffect(() => {
    if (workspace?.planId) setPlanId(workspace.planId);
  }, [workspace?.planId]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: adminKeys.workspace(organizationId),
    });
    await queryClient.invalidateQueries({ queryKey: ["admin", "workspaces"] });
  };

  const onError = (error: unknown) =>
    toast.error(getStandardErrorMessage(error));

  const assignMutation = useMutation({
    mutationFn: () =>
      assignAdminPlan({
        data: {
          organizationId,
          planId,
          resetCredits,
          note: note || undefined,
        },
      }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Plan assigned");
    },
    onError,
  });

  const creditsMutation = useMutation({
    mutationFn: () =>
      adjustAdminCredits({
        data: {
          organizationId,
          monthlyDelta,
          topupDelta,
          note: note || undefined,
        },
      }),
    onSuccess: async () => {
      await invalidate();
      setMonthlyDelta(0);
      setTopupDelta(0);
      toast.success("Credits adjusted");
    },
    onError,
  });

  const statusMutation = useMutation({
    mutationFn: (status: "active" | "suspended") =>
      setAdminWorkspaceStatus({
        data: { organizationId, status, note: note || undefined },
      }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Workspace status updated");
    },
    onError,
  });

  const roleMutation = useMutation({
    mutationFn: (input: { userId: string; isAdmin: boolean }) =>
      setAdminUserRole({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Role updated");
    },
    onError,
  });

  if (detail.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  if (!workspace) {
    return <p className="text-sm text-base-content/60">Workspace not found.</p>;
  }

  const plans = plansQuery.data ?? [];
  // Bound outside the JSX so the null check narrows inside the click handler.
  const linkedUserId = workspace.userId;

  return (
    <div className="space-y-5">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" />
        All workspaces
      </Link>

      {readOnly ? <LocalBillingNotice /> : null}

      <section className="rounded-lg border border-base-300 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold" data-ph-mask>
              {workspace.userEmail ?? workspace.organizationName}
            </h2>
            <p className="text-sm text-base-content/60">
              {workspace.userName ?? "No account linked"} ·{" "}
              {workspace.organizationName}
            </p>
            <p className="text-sm text-base-content/60">
              Signed up {formatDate(workspace.userCreatedAt)} · workspace
              created {formatDate(workspace.organizationCreatedAt)} · last
              sign-in {formatDateTime(workspace.lastLoginAt)}
            </p>
            <p className="mt-2 text-sm">
              {workspace.planName ?? "No plan"} ·{" "}
              {formatCredits(workspace.creditsRemaining)} credits left (
              {formatCreditsAsUsd(workspace.creditsRemaining)}) · period ends{" "}
              {formatDate(workspace.currentPeriodEnd)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {detail.data?.planFeatureKeys.map((key) => (
                <span key={key} className="badge badge-outline badge-sm">
                  {planFeatureLabel(key)}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`badge ${
                workspace.status === "suspended"
                  ? "badge-warning"
                  : "badge-ghost"
              }`}
            >
              {workspace.status ?? "no subscription"}
            </span>
            {linkedUserId ? (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                disabled={roleMutation.isPending}
                onClick={() =>
                  roleMutation.mutate({
                    userId: linkedUserId,
                    isAdmin: !workspace.isAdmin,
                  })
                }
              >
                {workspace.isAdmin ? "Revoke admin" : "Make admin"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-base-300 p-4">
        <h2 className="mb-3 font-semibold">Plan</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="form-control">
            <span className="label-text text-xs">Plan</span>
            <select
              className="select select-bordered select-sm"
              value={planId}
              onChange={(event) => setPlanId(event.target.value)}
              disabled={readOnly}
            >
              <option value="">Select a plan…</option>
              {plans
                .filter(
                  (plan) => !plan.archivedAt || plan.id === workspace.planId,
                )
                .map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={resetCredits}
              onChange={(event) => setResetCredits(event.target.checked)}
              disabled={readOnly}
            />
            Start a new period with this plan&apos;s credits
          </label>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={readOnly || !planId || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
          >
            Assign plan
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-base-300 p-4">
        <h2 className="mb-3 font-semibold">Credits</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="form-control">
            <span className="label-text text-xs">Monthly ±</span>
            <input
              type="number"
              className="input input-bordered input-sm w-32"
              value={monthlyDelta}
              onChange={(event) => setMonthlyDelta(Number(event.target.value))}
              disabled={readOnly}
            />
          </label>
          <label className="form-control">
            <span className="label-text text-xs">Top-up ± (rolls over)</span>
            <input
              type="number"
              className="input input-bordered input-sm w-32"
              value={topupDelta}
              onChange={(event) => setTopupDelta(Number(event.target.value))}
              disabled={readOnly}
            />
          </label>
          <button
            type="button"
            className="btn btn-sm"
            disabled={readOnly || creditsMutation.isPending}
            onClick={() => creditsMutation.mutate()}
          >
            Apply adjustment
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-base-300 p-4">
        <h2 className="mb-3 font-semibold">Access</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="form-control flex-1">
            <span className="label-text text-xs">
              Note (recorded on the ledger entry)
            </span>
            <input
              className="input input-bordered input-sm"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Why are you making this change?"
            />
          </label>
          <button
            type="button"
            className={`btn btn-sm ${
              workspace.status === "suspended" ? "btn-primary" : "btn-warning"
            }`}
            disabled={readOnly || statusMutation.isPending}
            onClick={() =>
              statusMutation.mutate(
                workspace.status === "suspended" ? "active" : "suspended",
              )
            }
          >
            {workspace.status === "suspended"
              ? "Reactivate workspace"
              : "Suspend workspace"}
          </button>
        </div>
        <p className="mt-2 text-xs text-base-content/60">
          A suspended workspace keeps its data and credits but is refused by
          every entitlement check until it is reactivated.
        </p>
      </section>

      <section className="rounded-lg border border-base-300 p-4">
        <h2 className="mb-3 font-semibold">
          Projects ({detail.data?.projects.length ?? 0})
        </h2>
        <ul className="space-y-1 text-sm">
          {detail.data?.projects.map((project) => (
            <li key={project.id} className="flex justify-between gap-3">
              <span>{project.name}</span>
              <span className="text-base-content/60">
                {project.domain ?? "no domain"}
              </span>
            </li>
          ))}
          {detail.data?.projects.length === 0 ? (
            <li className="text-base-content/60">No projects yet.</li>
          ) : null}
        </ul>
      </section>

      <UserLoginHistory events={detail.data?.loginEvents ?? []} />

      <WorkspaceLedgerTable entries={detail.data?.ledger ?? []} />
    </div>
  );
}
