import * as React from "react";
import {
  PLAN_FEATURE_KEYS,
  planFeatureLabel,
  type PlanFeatureKey,
} from "@/shared/plan-features";

export type PlanFormValues = {
  slug: string;
  name: string;
  description: string;
  monthlyCredits: number;
  priceUsdCents: number;
  sortOrder: number;
  featureKeys: PlanFeatureKey[];
};

export const emptyPlanForm: PlanFormValues = {
  slug: "",
  name: "",
  description: "",
  monthlyCredits: 0,
  priceUsdCents: 0,
  sortOrder: 0,
  featureKeys: ["managed_service_access"],
};

export function PlanForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  pending,
  slugEditable,
}: {
  values: PlanFormValues;
  onChange: (values: PlanFormValues) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel: string;
  pending: boolean;
  slugEditable: boolean;
}) {
  const set = <K extends keyof PlanFormValues>(
    key: K,
    value: PlanFormValues[K],
  ) => onChange({ ...values, [key]: value });

  const toggleFeature = (key: PlanFeatureKey) =>
    set(
      "featureKeys",
      values.featureKeys.includes(key)
        ? values.featureKeys.filter((entry) => entry !== key)
        : [...values.featureKeys, key],
    );

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="form-control">
          <span className="label-text text-xs">Name</span>
          <input
            className="input input-bordered input-sm"
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            required
          />
        </label>
        <label className="form-control">
          <span className="label-text text-xs">Slug</span>
          <input
            className="input input-bordered input-sm"
            value={values.slug}
            onChange={(event) => set("slug", event.target.value)}
            disabled={!slugEditable}
            required
          />
        </label>
      </div>

      <label className="form-control">
        <span className="label-text text-xs">Description</span>
        <input
          className="input input-bordered input-sm"
          value={values.description}
          onChange={(event) => set("description", event.target.value)}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="form-control">
          <span className="label-text text-xs">
            Monthly credits (1000 = $1 of data)
          </span>
          <input
            type="number"
            min={0}
            className="input input-bordered input-sm"
            value={values.monthlyCredits}
            onChange={(event) =>
              set("monthlyCredits", Number(event.target.value))
            }
          />
        </label>
        <label className="form-control">
          <span className="label-text text-xs">Price (cents / month)</span>
          <input
            type="number"
            min={0}
            className="input input-bordered input-sm"
            value={values.priceUsdCents}
            onChange={(event) =>
              set("priceUsdCents", Number(event.target.value))
            }
          />
        </label>
        <label className="form-control">
          <span className="label-text text-xs">Sort order</span>
          <input
            type="number"
            min={0}
            className="input input-bordered input-sm"
            value={values.sortOrder}
            onChange={(event) => set("sortOrder", Number(event.target.value))}
          />
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="label-text text-xs">
          What this plan may use — anything unchecked is refused before it costs
          you money
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {PLAN_FEATURE_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={values.featureKeys.includes(key)}
                onChange={() => toggleFeature(key)}
              />
              {planFeatureLabel(key)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex gap-2">
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={pending}
        >
          {pending ? (
            <span className="loading loading-spinner loading-xs" />
          ) : null}
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
