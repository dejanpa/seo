import {
  AUTUMN_SEO_DATA_CREDITS_PER_USD,
  SEO_DATA_COST_MARKUP,
  roundUsdForBilling,
} from "@/shared/billing";
import type { CreditFeature } from "@/shared/billing-credit-features";
import {
  planFeatureLabel,
  toolFeatureKeyFor,
  type PlanFeatureKey,
} from "@/shared/plan-features";
import type { BillingCustomerContext } from "@/server/billing/types";
import { LocalBillingRepository } from "@/server/billing/local/repository";
import { captureServerEvent } from "@/server/lib/posthog";
import { AppError } from "@/server/lib/errors";

type LocalBillingAccount = {
  organizationId: string;
  planId: string;
  planSlug: string;
  status: string;
  monthlyRemaining: number;
  topupRemaining: number;
  features: ReadonlySet<string>;
};

/**
 * Resolve an organization's live entitlement state, creating its subscription on
 * the default plan the first time it is seen and rolling an expired billing
 * period forward. Renewal is lazy — done on read rather than by a scheduled job
 * — so a deployment with no cron still renews correctly.
 */
async function loadAccount(
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
    monthlyRemaining: subscription.monthlyRemaining,
    topupRemaining: subscription.topupRemaining,
    features: new Set(features),
  };
}

function holdsFeature(account: LocalBillingAccount, key: PlanFeatureKey) {
  // A suspended organization keeps its data and balances but holds nothing.
  return account.status === "active" && account.features.has(key);
}

export async function getOrCreateOrganizationCustomer(
  context: BillingCustomerContext,
): Promise<{ id: string }> {
  await loadAccount(context.organizationId);
  return { id: context.organizationId };
}

export async function customerHasPaidPlan(
  customerId: string,
  // Accepted for signature parity with the Autumn provider, whose retry works
  // around degraded vendor reads. This provider reads its own database.
  _opts?: { retryDenied?: boolean },
) {
  return holdsFeature(await loadAccount(customerId), "paid_plan");
}

export async function customerHasManagedAccess(customerId: string) {
  return holdsFeature(await loadAccount(customerId), "managed_service_access");
}

/**
 * Gate before any billable provider call: refuses when the organization is
 * suspended, when its plan does not include the feature being used, or when its
 * credits are exhausted. Returns the monthly balance so the caller can split a
 * later spend monthly-first.
 */
export async function assertUsageCreditsAvailable(
  customerId: string,
  creditFeature?: CreditFeature,
): Promise<{ monthlyRemaining: number }> {
  const account = await loadAccount(customerId);

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

  if (account.monthlyRemaining + account.topupRemaining <= 0) {
    throw new AppError("INSUFFICIENT_CREDITS");
  }

  return { monthlyRemaining: account.monthlyRemaining };
}

export async function checkUsageCreditsDepleted(
  customer: BillingCustomerContext,
): Promise<{ depleted: boolean; monthlyRemaining: number }> {
  const account = await loadAccount(customer.organizationId);
  const depleted =
    account.status !== "active" ||
    account.monthlyRemaining + account.topupRemaining <= 0;

  if (depleted) {
    await captureServerEvent({
      distinctId: customer.userId,
      event: "usage:credits_gate_refused",
      organizationId: customer.organizationId,
      properties: {
        project_id: customer.projectId,
        monthly_remaining: account.monthlyRemaining,
        topup_remaining: account.topupRemaining,
      },
    });
  }

  return { depleted, monthlyRemaining: account.monthlyRemaining };
}

/**
 * Deduct a provider cost from the organization's credits: applies the same
 * markup and credits-per-USD conversion the Autumn provider uses, so a plan's
 * credit allowance means the same thing whichever provider is active. Monthly
 * credits are spent before rolled-over top-up credits.
 */
export async function trackUsageCreditSpend(args: {
  customer: BillingCustomerContext;
  customerId: string;
  creditFeature: CreditFeature;
  costUsd: number;
  monthlyRemaining: number;
  properties?: Record<string, unknown>;
}): Promise<void> {
  const totalCostUsd = roundUsdForBilling(args.costUsd * SEO_DATA_COST_MARKUP);
  const totalCostCredits = Math.ceil(
    totalCostUsd * AUTUMN_SEO_DATA_CREDITS_PER_USD,
  );
  if (totalCostCredits <= 0) return;

  const monthlyDeduct = Math.min(
    Math.max(args.monthlyRemaining, 0),
    totalCostCredits,
  );
  const topupDeduct = totalCostCredits - monthlyDeduct;

  await LocalBillingRepository.recordSpend({
    organizationId: args.customerId,
    monthlyDeduct,
    topupDeduct,
    creditFeature: args.creditFeature,
    costUsd: totalCostUsd,
  });

  await captureServerEvent({
    distinctId: args.customer.userId,
    event: "usage:credits_consume",
    organizationId: args.customer.organizationId,
    properties: {
      project_id: args.customer.projectId,
      credit_feature: args.creditFeature,
      monthly_credits: monthlyDeduct,
      topup_credits: topupDeduct,
      total_credits: totalCostCredits,
      cost_usd: totalCostUsd,
    },
  });
}
