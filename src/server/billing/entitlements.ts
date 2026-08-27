import {
  PLAN_FEATURE_KEYS,
  planFeatureLabel,
  type PlanFeatureKey,
} from "@/shared/plan-features";
import { listGrantedFeatureKeys } from "@/server/billing/subscription";
import { isHostedServerAuthMode } from "@/server/lib/runtime-env";
import { AppError } from "@/server/lib/errors";

/**
 * What this organization's plan allows. Self-hosted deployments have no plans
 * and no billing — metering is skipped for them too — so everything is granted
 * there rather than gated against a subscription that does not exist.
 */
export async function getGrantedFeatureKeys(
  organizationId: string,
): Promise<readonly PlanFeatureKey[]> {
  if (!(await isHostedServerAuthMode())) return PLAN_FEATURE_KEYS;
  return listGrantedFeatureKeys(organizationId);
}

/**
 * Refuse an action the plan does not include. The client dims these surfaces,
 * but the check has to live here as well — a dimmed button is a hint, not a
 * boundary.
 */
export async function assertPlanFeature(
  organizationId: string,
  key: PlanFeatureKey,
) {
  const granted = await getGrantedFeatureKeys(organizationId);
  if (!granted.includes(key)) {
    throw new AppError(
      "PAYMENT_REQUIRED",
      `Your plan does not include ${planFeatureLabel(key)}.`,
    );
  }
}
