import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { getPlanEntitlements } from "@/serverFunctions/billing";
import { planFeatureLabel, type PlanFeatureKey } from "@/shared/plan-features";

const entitlementsQueryKey = ["billing", "entitlements"] as const;

function usePlanEntitlements() {
  return useQuery({
    queryKey: entitlementsQueryKey,
    queryFn: () => getPlanEntitlements(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Whether the workspace's plan includes a capability. Undefined while the
 * answer is still loading, so a caller can avoid flashing a locked surface at
 * someone who is entitled to it.
 */
function usePlanFeature(key: PlanFeatureKey) {
  const { data } = usePlanEntitlements();
  return data ? data.featureKeys.includes(key) : undefined;
}

/**
 * Dims and disables a surface the plan does not include. Pointer events are
 * removed rather than every child being individually disabled, and the server
 * refuses the same actions anyway (see server/billing/entitlements.ts).
 */
export function PlanLockedSection({
  featureKey,
  className,
  children,
}: {
  featureKey: PlanFeatureKey;
  className?: string;
  children: ReactNode;
}) {
  const allowed = usePlanFeature(featureKey);
  if (allowed !== false) return <div className={className}>{children}</div>;

  return (
    <div className={className} aria-disabled="true">
      <p className="mb-2 flex items-center gap-1.5 text-xs text-base-content/50">
        <Lock className="size-3.5" />
        {planFeatureLabel(featureKey)} is not included in your plan
      </p>
      <div className="pointer-events-none select-none opacity-40">
        {children}
      </div>
    </div>
  );
}
