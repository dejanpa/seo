import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createAdminPlan,
  setAdminDefaultPlan,
  setAdminPlanArchived,
  updateAdminPlan,
} from "@/serverFunctions/admin";
import {
  adminKeys,
  useAdminOverview,
  useAdminPlans,
} from "@/client/features/admin/queries";
import {
  emptyPlanForm,
  PlanForm,
  type PlanFormValues,
} from "@/client/features/admin/PlanForm";
import { LocalBillingNotice } from "@/client/features/admin/LocalBillingNotice";
import { formatCredits, formatPrice } from "@/client/features/admin/format";
import { isPlanFeatureKey, planFeatureLabel } from "@/shared/plan-features";
import { getStandardErrorMessage } from "@/client/lib/error-messages";

export const Route = createFileRoute("/_app/admin/plans")({
  component: AdminPlansPage,
});

function AdminPlansPage() {
  const queryClient = useQueryClient();
  const overview = useAdminOverview();
  const plansQuery = useAdminPlans();
  const [creating, setCreating] = React.useState(false);
  const [createValues, setCreateValues] =
    React.useState<PlanFormValues>(emptyPlanForm);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editValues, setEditValues] = React.useState<PlanFormValues | null>(
    null,
  );

  const readOnly = overview.data ? !overview.data.localBilling : false;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: adminKeys.plans });

  const onError = (error: unknown) =>
    toast.error(getStandardErrorMessage(error));

  const createMutation = useMutation({
    mutationFn: (values: PlanFormValues) =>
      createAdminPlan({
        data: {
          ...values,
          description: values.description || null,
          featureKeys: values.featureKeys,
        },
      }),
    onSuccess: async () => {
      await invalidate();
      setCreating(false);
      setCreateValues(emptyPlanForm);
      toast.success("Plan created");
    },
    onError,
  });

  const updateMutation = useMutation({
    mutationFn: (input: { planId: string; values: PlanFormValues }) =>
      updateAdminPlan({
        data: {
          planId: input.planId,
          name: input.values.name,
          description: input.values.description || null,
          monthlyCredits: input.values.monthlyCredits,
          priceUsdCents: input.values.priceUsdCents,
          sortOrder: input.values.sortOrder,
          featureKeys: input.values.featureKeys,
        },
      }),
    onSuccess: async () => {
      await invalidate();
      setEditingId(null);
      setEditValues(null);
      toast.success("Plan saved");
    },
    onError,
  });

  const defaultMutation = useMutation({
    mutationFn: (planId: string) => setAdminDefaultPlan({ data: { planId } }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Default plan updated");
    },
    onError,
  });

  const archiveMutation = useMutation({
    mutationFn: (input: { planId: string; archived: boolean }) =>
      setAdminPlanArchived({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Plan updated");
    },
    onError,
  });

  if (plansQuery.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  const plans = plansQuery.data ?? [];

  return (
    <div className="space-y-4">
      {readOnly ? <LocalBillingNotice /> : null}

      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={readOnly}
          onClick={() => setCreating((value) => !value)}
        >
          <Plus className="size-4" />
          New plan
        </button>
      </div>

      {creating ? (
        <div className="rounded-lg border border-base-300 p-4">
          <h2 className="mb-3 font-semibold">New plan</h2>
          <PlanForm
            values={createValues}
            onChange={setCreateValues}
            onSubmit={() => createMutation.mutate(createValues)}
            onCancel={() => setCreating(false)}
            submitLabel="Create plan"
            pending={createMutation.isPending}
            slugEditable
          />
        </div>
      ) : null}

      <ul className="space-y-3">
        {plans.map((plan) => {
          const isEditing = editingId === plan.id;
          return (
            <li key={plan.id} className="rounded-lg border border-base-300 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{plan.name}</h2>
                    <code className="text-xs text-base-content/60">
                      {plan.slug}
                    </code>
                    {plan.isDefault ? (
                      <span className="badge badge-primary badge-sm">
                        default
                      </span>
                    ) : null}
                    {plan.archivedAt ? (
                      <span className="badge badge-ghost badge-sm">
                        archived
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-base-content/60">
                    {plan.description ?? "No description"}
                  </p>
                  <p className="mt-1 text-sm">
                    {formatPrice(plan.priceUsdCents)} ·{" "}
                    {formatCredits(plan.monthlyCredits)} credits/month (
                    {`$${plan.monthlyCreditsUsd.toFixed(2)}`} of data)
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {plan.featureKeys.length === 0 ? (
                      <span className="text-xs text-base-content/50">
                        No features granted — this plan can do nothing
                      </span>
                    ) : (
                      plan.featureKeys.map((key) => (
                        <span
                          key={key}
                          className="badge badge-outline badge-sm"
                        >
                          {planFeatureLabel(key)}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    disabled={readOnly}
                    onClick={() => {
                      setEditingId(isEditing ? null : plan.id);
                      setEditValues(
                        isEditing
                          ? null
                          : {
                              slug: plan.slug,
                              name: plan.name,
                              description: plan.description ?? "",
                              monthlyCredits: plan.monthlyCredits,
                              priceUsdCents: plan.priceUsdCents,
                              sortOrder: plan.sortOrder,
                              // Rows come back as plain strings; keep only
                              // keys this build still knows about.
                              featureKeys:
                                plan.featureKeys.filter(isPlanFeatureKey),
                            },
                      );
                    }}
                  >
                    {isEditing ? "Close" : "Edit"}
                  </button>
                  {!plan.isDefault && !plan.archivedAt ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      disabled={readOnly || defaultMutation.isPending}
                      onClick={() => defaultMutation.mutate(plan.id)}
                    >
                      Make default
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    disabled={readOnly || archiveMutation.isPending}
                    onClick={() =>
                      archiveMutation.mutate({
                        planId: plan.id,
                        archived: !plan.archivedAt,
                      })
                    }
                  >
                    {plan.archivedAt ? "Restore" : "Archive"}
                  </button>
                </div>
              </div>

              {isEditing && editValues ? (
                <div className="mt-4 border-t border-base-300 pt-4">
                  <PlanForm
                    values={editValues}
                    onChange={setEditValues}
                    onSubmit={() =>
                      updateMutation.mutate({
                        planId: plan.id,
                        values: editValues,
                      })
                    }
                    onCancel={() => {
                      setEditingId(null);
                      setEditValues(null);
                    }}
                    submitLabel="Save plan"
                    pending={updateMutation.isPending}
                    slugEditable={false}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
