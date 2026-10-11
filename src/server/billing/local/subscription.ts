import { applyBillingMarkupUsd, creditsForProviderUsd } from "@/shared/billing";
import type { CreditFeature } from "@/shared/billing-credit-features";
import {
  PLAN_FEATURE_KEYS,
  planFeatureLabel,
  toolFeatureKeyFor,
  type PlanFeatureKey,
} from "@/shared/plan-features";
import type {
  BillingCustomerContext,
  UsageCreditHold,
} from "@/server/billing/types";
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
 * Everything this organization's plan grants, for the surfaces that decide what
 * to show rather than what to charge. Driven from PLAN_FEATURE_KEYS so a stale
 * row in plan_features cannot widen the answer.
 */
export async function listGrantedFeatureKeys(
  customerId: string,
): Promise<readonly PlanFeatureKey[]> {
  const account = await loadAccount(customerId);
  if (account.status !== "active") return [];
  return PLAN_FEATURE_KEYS.filter((key) => account.features.has(key));
}

function assertAccountCanSpend(
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

// Compare-and-set attempts before giving up on a hold. Each retry means another
// call on the same workspace changed the balance in between, so a few cover any
// realistic burst.
const HOLD_ATTEMPTS = 5;

/**
 * Gate before any billable provider call: refuses when the organization is
 * suspended, when its plan does not include the feature being used, or when its
 * balances cannot cover the call's estimated cost. Otherwise takes that
 * estimate off the balance (monthly credits first) before the call runs, so
 * concurrent calls cannot together spend more than the organization has.
 */
export async function reserveUsageCredits(args: {
  customerId: string;
  creditFeature?: CreditFeature;
  estimateUsd: number;
}): Promise<UsageCreditHold> {
  const account = await loadAccount(args.customerId);
  assertAccountCanSpend(account, args.creditFeature);

  const credits = Math.max(1, creditsForProviderUsd(args.estimateUsd));
  let monthly = account.monthlyRemaining;
  let topup = account.topupRemaining;

  for (let attempt = 0; attempt < HOLD_ATTEMPTS; attempt++) {
    if (monthly + topup < credits) {
      throw new AppError("INSUFFICIENT_CREDITS");
    }
    const monthlyDeduct = Math.min(Math.max(monthly, 0), credits);
    const topupDeduct = credits - monthlyDeduct;

    const held = await LocalBillingRepository.holdCredits({
      organizationId: args.customerId,
      expectedMonthly: monthly,
      expectedTopup: topup,
      monthlyDeduct,
      topupDeduct,
      creditFeature: args.creditFeature ?? null,
    });
    if (held) {
      return {
        customerId: args.customerId,
        heldMonthly: monthlyDeduct,
        heldTopup: topupDeduct,
        monthlyRemaining: monthly - monthlyDeduct,
      };
    }

    const current = await LocalBillingRepository.getSubscription(
      args.customerId,
    );
    if (!current) break;
    monthly = current.monthlyRemaining;
    topup = current.topupRemaining;
  }

  throw new AppError(
    "CONFLICT",
    "Too many requests are spending credits at once. Try again.",
  );
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
  const totalCostUsd = applyBillingMarkupUsd(args.costUsd);
  const totalCostCredits = creditsForProviderUsd(args.costUsd);
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

/**
 * Settle a hold against the cost DataForSEO reported: returns the unused part
 * of the hold (top-up first, since top-up credits roll over), or charges the
 * shortfall when the estimate undershot. Always writes a ledger row, so every
 * call's real cost is on record even when the hold was exact.
 */
export async function settleUsageCredits(args: {
  customer: BillingCustomerContext;
  hold: UsageCreditHold;
  creditFeature: CreditFeature;
  costUsd: number;
  properties?: Record<string, unknown>;
}): Promise<void> {
  const { hold } = args;
  const actualCredits = creditsForProviderUsd(args.costUsd);
  const heldCredits = hold.heldMonthly + hold.heldTopup;
  const difference = actualCredits - heldCredits;

  let monthlyDeduct = 0;
  let topupDeduct = 0;
  if (difference < 0) {
    const refund = -difference;
    topupDeduct = -Math.min(hold.heldTopup, refund);
    monthlyDeduct = -(refund + topupDeduct);
  } else if (difference > 0) {
    console.warn(
      `[billing] DataForSEO cost ${args.costUsd} USD exceeded its hold by ${difference} credits`,
      args.properties,
    );
    monthlyDeduct = Math.min(Math.max(hold.monthlyRemaining, 0), difference);
    topupDeduct = difference - monthlyDeduct;
  }

  const totalCostUsd = applyBillingMarkupUsd(args.costUsd);
  await LocalBillingRepository.recordSpend({
    organizationId: hold.customerId,
    monthlyDeduct,
    topupDeduct,
    creditFeature: args.creditFeature,
    costUsd: totalCostUsd,
  });

  if (actualCredits <= 0) return;
  await captureServerEvent({
    distinctId: args.customer.userId,
    event: "usage:credits_consume",
    organizationId: args.customer.organizationId,
    properties: {
      project_id: args.customer.projectId,
      credit_feature: args.creditFeature,
      monthly_credits: hold.heldMonthly + monthlyDeduct,
      topup_credits: hold.heldTopup + topupDeduct,
      total_credits: actualCredits,
      cost_usd: totalCostUsd,
      ...args.properties,
    },
  });
}
