import {
  AUTUMN_SEO_DATA_BALANCE_FEATURE_ID,
  AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
  applyBillingMarkupUsd,
  creditsForProviderUsd,
} from "@/shared/billing";
import type { CreditFeature } from "@/shared/billing-credit-features";
import type {
  BillingCustomerContext,
  UsageCreditFeatureId,
  UsageCreditHold,
} from "@/server/billing/types";
import {
  assertAccountCanSpend,
  loadAccount,
} from "@/server/billing/local/account";
import {
  LocalBillingRepository,
  type CreditPool,
} from "@/server/billing/local/repository";
import { captureServerEvent } from "@/server/lib/posthog";
import { AppError } from "@/server/lib/errors";

// The local provider's side of upstream's hold-then-settle credit contract:
// DataForSEO calls take a hold on one credit pool before they run and settle
// it on the cost DataForSEO reports.

// Compare-and-set attempts before giving up on a hold. Each retry means another
// call on the same workspace changed the balance in between, so a few cover any
// realistic burst.
const HOLD_ATTEMPTS = 5;

function poolOf(featureId: UsageCreditFeatureId): CreditPool {
  return featureId === AUTUMN_SEO_DATA_BALANCE_FEATURE_ID ? "monthly" : "topup";
}

/**
 * Atomically holds `estimatedCredits` on one balance (monthly `usage_credits`
 * or rolled-over `topup_credits`): a compare-and-set on that balance column,
 * so concurrent calls cannot all pass on the same reading. Refuses
 * (allowed: false) when the balance is short. The hold's ledger row id is its
 * lockId, which is how finalizeHold finds it again.
 *
 * Unlike Autumn's lock there is no TTL: a hold whose call never settles stays
 * deducted (the customer is over-held, never under-charged) until an operator
 * adjusts it from /admin.
 */
export async function holdCredits(args: {
  customerId: string;
  featureId: UsageCreditFeatureId;
  estimatedCredits: number;
  callIndexes: readonly number[];
  properties: Record<string, unknown>;
  ttlMs?: number;
  lockPrefix?: string;
}): Promise<{ hold: UsageCreditHold; allowed: boolean; balance: null }> {
  const { customerId, featureId, estimatedCredits, callIndexes } = args;
  const lockId = `${args.lockPrefix ?? "dfs"}_${customerId}_${crypto.randomUUID()}`;
  const hold: UsageCreditHold = {
    lockId,
    featureId,
    estimatedCredits,
    callIndexes,
  };
  const pool = poolOf(featureId);
  const creditFeature =
    typeof args.properties.creditFeature === "string"
      ? args.properties.creditFeature
      : null;

  for (let attempt = 0; attempt < HOLD_ATTEMPTS; attempt++) {
    const subscription =
      await LocalBillingRepository.getSubscription(customerId);
    if (!subscription) break;
    const balance =
      pool === "monthly"
        ? subscription.monthlyRemaining
        : subscription.topupRemaining;
    if (balance < estimatedCredits)
      return { hold, allowed: false, balance: null };

    const held = await LocalBillingRepository.holdCredits({
      lockId,
      organizationId: customerId,
      pool,
      expected: balance,
      credits: estimatedCredits,
      creditFeature,
    });
    if (held) return { hold, allowed: true, balance: null };
  }

  throw new AppError(
    "CONFLICT",
    "Too many requests are spending credits at once. Try again.",
  );
}

/**
 * Reserves credits for a batch of provider calls before they are made, one
 * estimate per call, the way upstream's Autumn provider does: calls go, in
 * order, on monthly credits while they cover them, else on top-up credits,
 * else they are refused. Also the plan gate: refuses a suspended workspace or
 * a tool the plan does not include before anything is held.
 *
 * Throws INSUFFICIENT_CREDITS when no call fits. The caller must settle every
 * returned hold with settleUsageCredits once its calls' real cost is known.
 */
export async function reserveUsageCredits(args: {
  customer: BillingCustomerContext;
  customerId: string;
  callCredits: number[];
  creditFeature?: CreditFeature;
}): Promise<{ holds: UsageCreditHold[]; refusedCalls: number[] }> {
  const account = await loadAccount(args.customerId);
  assertAccountCanSpend(account, args.creditFeature);

  const callCredits = args.callCredits.map((credits) => Math.max(1, credits));
  const properties = { creditFeature: args.creditFeature };
  const holds: UsageCreditHold[] = [];

  // Places the calls that fit `remaining` on one pool and holds them. A
  // refused hold means the balance moved since the read; those calls fall
  // through to the next pool.
  const holdFitting = async (
    featureId: UsageCreditFeatureId,
    calls: number[],
    remaining: number,
  ) => {
    const fitting: number[] = [];
    let credits = 0;
    for (const index of calls) {
      if (credits + callCredits[index] > remaining) continue;
      fitting.push(index);
      credits += callCredits[index];
    }
    if (fitting.length === 0) return calls;
    const result = await holdCredits({
      customerId: args.customerId,
      featureId,
      estimatedCredits: credits,
      callIndexes: fitting,
      properties,
    });
    if (!result.allowed) return calls;
    holds.push(result.hold);
    return calls.filter((index) => !fitting.includes(index));
  };

  let refusedCalls: number[];
  try {
    const afterMonthly = await holdFitting(
      AUTUMN_SEO_DATA_BALANCE_FEATURE_ID,
      callCredits.map((_, index) => index),
      account.monthlyRemaining,
    );
    refusedCalls = await holdFitting(
      AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
      afterMonthly,
      account.topupRemaining,
    );
  } catch (error) {
    for (const hold of holds) await finalizeHold(hold, 0, {});
    throw error;
  }

  if (refusedCalls.length > 0) {
    await captureServerEvent({
      distinctId: args.customer.userId,
      event: "usage:credits_gate_refused",
      organizationId: args.customer.organizationId,
      properties: {
        project_id: args.customer.projectId,
        reason: "estimate_exceeds_balance",
        source: "dataforseo",
        credit_feature: args.creditFeature,
        monthly_remaining: account.monthlyRemaining,
        topup_remaining: account.topupRemaining,
      },
    });
  }
  if (holds.length === 0) throw new AppError("INSUFFICIENT_CREDITS");
  return { holds, refusedCalls };
}

/**
 * Confirms `credits` against a hold, returning the rest to the pool it was
 * taken from (or charging the shortfall there when the call cost more), or
 * releases the whole hold when `credits` is 0. Idempotent per hold: a repeat
 * finds the settlement already recorded and changes nothing.
 */
export async function finalizeHold(
  hold: UsageCreditHold,
  credits: number,
  properties: Record<string, unknown>,
): Promise<{ landed: boolean; error?: unknown }> {
  try {
    await LocalBillingRepository.settleHold({
      lockId: hold.lockId,
      pool: poolOf(hold.featureId),
      refund: hold.estimatedCredits - credits,
      creditFeature:
        typeof properties.creditFeature === "string"
          ? properties.creditFeature
          : null,
      costUsd:
        typeof properties.totalCostUsd === "number"
          ? properties.totalCostUsd
          : null,
    });
    return { landed: true };
  } catch (error) {
    return { landed: false, error };
  }
}

/**
 * Settles a hold on the provider's real cost. Never throws: the customer
 * already has the data, so a failed settlement is logged with what is needed
 * to reconcile it and the credits stay held.
 */
export async function settleUsageCredits(args: {
  customer: BillingCustomerContext;
  hold: UsageCreditHold;
  creditFeature?: CreditFeature;
  costs: Array<{ costUsd: number; path: string[] }>;
}): Promise<void> {
  const { customer, hold, creditFeature, costs } = args;
  let actualCredits = 0;
  let totalCostUsd = 0;
  for (const cost of costs) {
    actualCredits += creditsForProviderUsd(cost.costUsd);
    totalCostUsd += applyBillingMarkupUsd(cost.costUsd);
  }
  const paths = [...new Set(costs.map((cost) => cost.path.join("/")))];

  const { landed, error } = await finalizeHold(hold, actualCredits, {
    creditFeature,
    totalCostUsd,
  });
  if (!landed) {
    console.error("[billing] local hold settlement failed", {
      organizationId: customer.organizationId,
      lockId: hold.lockId,
      held: hold.estimatedCredits,
      actual: actualCredits,
      error,
    });
    return;
  }
  if (actualCredits <= 0) return;

  const onMonthly = hold.featureId === AUTUMN_SEO_DATA_BALANCE_FEATURE_ID;
  await captureServerEvent({
    distinctId: customer.userId,
    event: "usage:credits_consume",
    organizationId: customer.organizationId,
    properties: {
      project_id: customer.projectId,
      credit_feature: creditFeature,
      monthly_credits: onMonthly ? actualCredits : 0,
      topup_credits: onMonthly ? 0 : actualCredits,
      total_credits: actualCredits,
      cost_usd: totalCostUsd,
      estimated_credits: hold.estimatedCredits,
      paths,
    },
  });

  // The estimate is meant to be an upper bound; an undershoot means a price
  // constant in pricing.ts is stale and the spend bound has a hole.
  if (actualCredits > hold.estimatedCredits) {
    console.error("[billing] estimate undershoot", {
      paths,
      estimated: hold.estimatedCredits,
      actual: actualCredits,
    });
  }
}
