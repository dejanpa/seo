import { Button } from "@/client/components/ui/button";
import { Checkbox } from "@/client/components/ui/checkbox";
import {
  Field,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { Spinner } from "@/client/components/ui/spinner";
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

  const field = (
    key: "name" | "slug" | "description",
    label: string,
    options: { required?: boolean; disabled?: boolean } = {},
  ) => (
    <Field>
      <FieldLabel htmlFor={`plan-${key}`}>{label}</FieldLabel>
      <Input
        id={`plan-${key}`}
        value={values[key]}
        onChange={(event) => set(key, event.target.value)}
        required={options.required}
        disabled={options.disabled}
      />
    </Field>
  );

  const numberField = (
    key: "monthlyCredits" | "priceUsdCents" | "sortOrder",
    label: string,
  ) => (
    <Field>
      <FieldLabel htmlFor={`plan-${key}`}>{label}</FieldLabel>
      <Input
        id={`plan-${key}`}
        type="number"
        min={0}
        value={values[key]}
        onChange={(event) => set(key, Number(event.target.value))}
      />
    </Field>
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
        {field("name", "Name", { required: true })}
        {field("slug", "Slug", { required: true, disabled: !slugEditable })}
      </div>

      {field("description", "Description")}

      <div className="grid gap-3 sm:grid-cols-3">
        {numberField("monthlyCredits", "Monthly credits (1000 = $1 of data)")}
        {numberField("priceUsdCents", "Price (cents / month)")}
        {numberField("sortOrder", "Sort order")}
      </div>

      <FieldSet>
        <FieldLegend variant="label">
          What this plan may use — anything unchecked is refused before it costs
          you money
        </FieldLegend>
        <div className="grid gap-2 sm:grid-cols-3">
          {PLAN_FEATURE_KEYS.map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={values.featureKeys.includes(key)}
                onCheckedChange={() => toggleFeature(key)}
              />
              {planFeatureLabel(key)}
            </label>
          ))}
        </div>
      </FieldSet>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
