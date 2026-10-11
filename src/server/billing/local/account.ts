import type { CreditFeature } from "@/shared/billing-credit-features";
import {
  planFeatureLabel,
  toolFeatureKeyFor,
  type PlanFeatureKey,
} from "@/shared/plan-features";
import { LocalBillingRepository } from "@/server/billing/local/repository";
import { AppError } from "@/server/lib/errors";

type LocalBillingAccount = {
  organizationId: string;
  planId: string;
  planSlug: string;
  status: string;
  monthlyCredits: number;
  monthlyRemaining: number;
  topupRemaining: number;
  currentPeriodEnd: string;
  features: ReadonlySet<string>;
};

/**
 * Resolve an organization's live entitlement state, creating its subscription on
 * the default plan the first time it is seen and rolling an expired billing
 * period forward. Renewal is lazy — done on read rather than by a scheduled job
 * — so a deployment with no cron still renews correctly.
 */
export async function loadAccount(
  organizationId: string,
): Promise<LocalBillingAccount> {
  let subscription =
    await LocalBillingRepository.getSubscription(organizationId);

  if (!subscription) {
    const defaultPlan = await LocalBillingRepository.getDefaultPlan();
    if (!defaultPlan) {
      throw new AppError(
        "INTERNAL_ERROR",
        "No billing plan is configured. Seed at least one plan (npm run seed:plans) before serving hosted traffic.",
      );
    }
    subscription = await LocalBillingRepository.createSubscription({
      organizationId,
      plan: defaultPlan,
    });
    if (!subscription) {
      throw new AppError(
        "INTERNAL_ERROR",
        `Failed to create a subscription for organization ${organizationId}`,
      );
    }
  }

  const plan = await LocalBillingRepository.getPlanById(subscription.planId);
  if (!plan) {
    throw new AppError(
      "INTERNAL_ERROR",
      `Organization ${organizationId} references missing plan ${subscription.planId}`,
    );
  }

  if (subscription.currentPeriodEnd <= LocalBillingRepository.nowIso()) {
    subscription =
      (await LocalBillingRepository.rollExpiredPeriod({
        organizationId,
        plan,
        currentPeriodEnd: subscription.currentPeriodEnd,
      })) ?? subscription;
  }

  const features = await LocalBillingRepository.listPlanFeatureKeys(plan.id);

  return {
    organizationId,
    planId: plan.id,
    planSlug: plan.slug,
    status: subscription.status,
    monthlyCredits: plan.monthlyCredits,
    monthlyRemaining: subscription.monthlyRemaining,
    topupRemaining: subscription.topupRemaining,
    currentPeriodEnd: subscription.currentPeriodEnd,
    features: new Set(features),
  };
}

export function holdsFeature(
  account: LocalBillingAccount,
  key: PlanFeatureKey,
) {
  // A suspended organization keeps its data and balances but holds nothing.
  return account.status === "active" && account.features.has(key);
}

/**
 * Refuses a suspended workspace, or a tool its plan does not include, before
 * any provider spend.
 */
export function assertAccountCanSpend(
  account: LocalBillingAccount,
  creditFeature?: CreditFeature,
) {
  if (account.status !== "active") {
    throw new AppError(
      "PAYMENT_REQUIRED",
      "This workspace is suspended. Contact the administrator.",
    );
  }

  const toolKey = creditFeature ? toolFeatureKeyFor(creditFeature) : null;
  if (toolKey && !account.features.has(toolKey)) {
    throw new AppError(
      "PAYMENT_REQUIRED",
      `The ${account.planSlug} plan does not include ${planFeatureLabel(toolKey)}.`,
    );
  }
}
