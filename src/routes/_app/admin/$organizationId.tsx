import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BackLink } from "@/client/components/PageHeader";
import { Spinner } from "@/client/components/Spinner";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Checkbox } from "@/client/components/ui/checkbox";
import { Field, FieldLabel } from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
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
        <Spinner />
      </div>
    );
  }

  if (!workspace) {
    return (
      <p className="text-sm text-muted-foreground">Workspace not found.</p>
    );
  }

  const plans = plansQuery.data ?? [];
  const planItems = [
    { value: "", label: "Select a plan…" },
    ...plans
      .filter((plan) => !plan.archivedAt || plan.id === workspace.planId)
      .map((plan) => ({ value: plan.id, label: plan.name })),
  ];
  // Bound outside the JSX so the null check narrows inside the click handler.
  const linkedUserId = workspace.userId;
  const suspended = workspace.status === "suspended";

  return (
    <div className="space-y-5">
      <BackLink to="/admin">All workspaces</BackLink>

      {readOnly ? <LocalBillingNotice /> : null}

      <Card>
        <CardContent>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold" data-ph-mask>
                {workspace.userEmail ?? workspace.organizationName}
              </h2>
              <p className="text-sm text-muted-foreground">
                {workspace.userName ?? "No account linked"} ·{" "}
                {workspace.organizationName}
              </p>
              <p className="text-sm text-muted-foreground">
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
                  <Badge key={key} variant="outline">
                    {planFeatureLabel(key)}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={suspended ? "warning" : "secondary"}>
                {workspace.status ?? "no subscription"}
              </Badge>
              {linkedUserId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={roleMutation.isPending}
                  onClick={() =>
                    roleMutation.mutate({
                      userId: linkedUserId,
                      isAdmin: !workspace.isAdmin,
                    })
                  }
                >
                  {workspace.isAdmin ? "Revoke admin" : "Make admin"}
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Plan</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Field className="w-56">
            <FieldLabel>Plan</FieldLabel>
            <Select
              items={planItems}
              value={planId}
              onValueChange={(value) => setPlanId(value ?? "")}
              disabled={readOnly}
            >
              <SelectTrigger aria-label="Plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {planItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm">
            <Checkbox
              checked={resetCredits}
              onCheckedChange={(checked) => setResetCredits(checked)}
              disabled={readOnly}
            />
            Start a new period with this plan&apos;s credits
          </label>
          <Button
            type="button"
            disabled={readOnly || !planId || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
          >
            Assign plan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Credits</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Field className="w-36">
            <FieldLabel htmlFor="monthly-delta">Monthly ±</FieldLabel>
            <Input
              id="monthly-delta"
              type="number"
              value={monthlyDelta}
              onChange={(event) => setMonthlyDelta(Number(event.target.value))}
              disabled={readOnly}
            />
          </Field>
          <Field className="w-44">
            <FieldLabel htmlFor="topup-delta">Top-up ± (rolls over)</FieldLabel>
            <Input
              id="topup-delta"
              type="number"
              value={topupDelta}
              onChange={(event) => setTopupDelta(Number(event.target.value))}
              disabled={readOnly}
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            disabled={readOnly || creditsMutation.isPending}
            onClick={() => creditsMutation.mutate()}
          >
            Apply adjustment
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Access</h2>
          </CardTitle>
          <CardDescription>
            A suspended workspace keeps its data and credits but is refused by
            every entitlement check until it is reactivated.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Field className="min-w-64 flex-1">
            <FieldLabel htmlFor="ledger-note">
              Note (recorded on the ledger entry)
            </FieldLabel>
            <Input
              id="ledger-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Why are you making this change?"
            />
          </Field>
          <Button
            type="button"
            variant={suspended ? "default" : "destructive"}
            disabled={readOnly || statusMutation.isPending}
            onClick={() =>
              statusMutation.mutate(suspended ? "active" : "suspended")
            }
          >
            {suspended ? "Reactivate workspace" : "Suspend workspace"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Projects ({detail.data?.projects.length ?? 0})</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {detail.data?.projects.map((project) => (
              <li key={project.id} className="flex justify-between gap-3">
                <span>{project.name}</span>
                <span className="text-muted-foreground">
                  {project.domain ?? "no domain"}
                </span>
              </li>
            ))}
            {detail.data?.projects.length === 0 ? (
              <li className="text-muted-foreground">No projects yet.</li>
            ) : null}
          </ul>
        </CardContent>
      </Card>

      <UserLoginHistory events={detail.data?.loginEvents ?? []} />

      <WorkspaceLedgerTable entries={detail.data?.ledger ?? []} />
    </div>
  );
}
