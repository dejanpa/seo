import type { CreditFeature } from "@/shared/billing-credit-features";
import { isLocalBillingProvider } from "@/server/billing/provider";
import type {
  BillingCustomerContext,
  BillingProviderApi,
} from "@/server/billing/types";

export type { BillingCustomerContext };

let localProvider: Promise<BillingProviderApi> | undefined;
let autumnProvider: Promise<BillingProviderApi> | undefined;

/**
 * The billing seam every caller goes through. Which implementation answers is
 * decided per call by BILLING_PROVIDER (see ./provider.ts): Autumn, the hosted
 * default, or this deployment's own plans tables.
 *
 * Both imports are dynamic so a deployment only ever loads the provider it
 * uses — Autumn keeps its ~450 kB SDK out of a local-billing isolate, and the
 * local provider keeps the database client out of an Autumn one.
 */
function provider(): Promise<BillingProviderApi> {
  return isLocalBillingProvider().then((local) =>
    local
      ? (localProvider ??= import("@/server/billing/local/subscription"))
      : (autumnProvider ??= import("@/server/billing/autumn-subscription")),
  );
}

export async function getOrCreateOrganizationCustomer(
  context: BillingCustomerContext,
): Promise<{ id: string }> {
  return (await provider()).getOrCreateOrganizationCustomer(context);
}

export async function customerHasPaidPlan(
  customerId: string,
  opts: { retryDenied?: boolean } = {},
) {
  return (await provider()).customerHasPaidPlan(customerId, opts);
}

export async function customerHasManagedAccess(customerId: string) {
  return (await provider()).customerHasManagedAccess(customerId);
}

export async function assertUsageCreditsAvailable(
  customerId: string,
  creditFeature?: CreditFeature,
): Promise<{ monthlyRemaining: number }> {
  return (await provider()).assertUsageCreditsAvailable(
    customerId,
    creditFeature,
  );
}

export async function checkUsageCreditsDepleted(
  customer: BillingCustomerContext,
): Promise<{ depleted: boolean; monthlyRemaining: number }> {
  return (await provider()).checkUsageCreditsDepleted(customer);
}

export async function trackUsageCreditSpend(args: {
  customer: BillingCustomerContext;
  customerId: string;
  creditFeature: CreditFeature;
  costUsd: number;
  monthlyRemaining: number;
  properties?: Record<string, unknown>;
}): Promise<void> {
  return (await provider()).trackUsageCreditSpend(args);
}
