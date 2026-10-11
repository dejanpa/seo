import {
  applyBillingMarkupUsd,
  autumnSeoDataCreditsToUsd,
  creditsForProviderUsd,
} from "@/shared/billing";
import type { BillingAccount } from "@/server/billing/billing-account";
import type { CreditFeature } from "@/shared/billing-credit-features";
import { PLAN_FEATURE_KEYS, type PlanFeatureKey } from "@/shared/plan-features";
import type { BillingCustomerContext } from "@/server/billing/types";
import { LocalBillingRepository } from "@/server/billing/local/repository";
import { holdsFeature, loadAccount } from "@/server/billing/local/account";
import { captureServerEvent } from "@/server/lib/posthog";

export {
  finalizeHold,
  holdCredits,
  reserveUsageCredits,
  settleUsageCredits,
} from "@/server/billing/local/credit-holds";

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

/** The billing screens' view of the organization, from this deployment's plans. */
export async function getLocalBillingAccount(
  context: BillingCustomerContext,
): Promise<BillingAccount> {
  const account = await loadAccount(context.organizationId);
  const paid = holdsFeature(account, "paid_plan");
  return {
    planStatus: paid ? "paid" : "free",
    paidPlanId: paid ? account.planSlug : null,
    monthlyCreditsUsd: autumnSeoDataCreditsToUsd(account.monthlyCredits),
    monthlyRemainingUsd: autumnSeoDataCreditsToUsd(account.monthlyRemaining),
    topUpRemainingUsd: autumnSeoDataCreditsToUsd(account.topupRemaining),
    hasManagedAccess: holdsFeature(account, "managed_service_access"),
    isPastDue: false,
    monthlyRefillsAt: Date.parse(account.currentPeriodEnd),
  };
}

/** Remaining monthly and rolled-over top-up credits. */
export async function getUsageCreditsRemaining(customerId: string): Promise<{
  monthlyRemaining: number;
  topupRemaining: number;
}> {
  const account = await loadAccount(customerId);
  return {
    monthlyRemaining: account.monthlyRemaining,
    topupRemaining: account.topupRemaining,
  };
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
 * Deduct a provider cost after the fact, for spend whose cost is unknowable
 * up front (LLM research). Same markup and credits-per-USD conversion as
 * holds, so a plan's allowance means the same thing whichever provider is
 * active. Monthly credits are spent before rolled-over top-up credits; with
 * `overdraft`, available top-ups go first and any excess overdraws monthly.
 */
export async function trackUsageCreditSpend(args: {
  customer: BillingCustomerContext;
  customerId: string;
  creditFeature: CreditFeature;
  costUsd: number;
  monthlyRemaining: number;
  overdraft?: { topupRemaining: number };
  properties?: Record<string, unknown>;
}): Promise<{ monthlyCredits: number; topupCredits: number }> {
  const totalCostUsd = applyBillingMarkupUsd(args.costUsd);
  const totalCostCredits = creditsForProviderUsd(args.costUsd);
  if (totalCostCredits <= 0) return { monthlyCredits: 0, topupCredits: 0 };

  let monthlyDeduct = Math.min(
    Math.max(args.monthlyRemaining, 0),
    totalCostCredits,
  );
  let topupDeduct = totalCostCredits - monthlyDeduct;
  if (args.overdraft) {
    topupDeduct = Math.min(
      topupDeduct,
      Math.max(args.overdraft.topupRemaining, 0),
    );
    monthlyDeduct = totalCostCredits - topupDeduct;
  }

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
      ...args.properties,
    },
  });
  return { monthlyCredits: monthlyDeduct, topupCredits: topupDeduct };
}
