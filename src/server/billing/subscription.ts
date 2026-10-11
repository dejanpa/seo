import { isLocalBillingProvider } from "@/server/billing/provider";
import type { BillingProviderApi } from "@/server/billing/types";

export type {
  BillingCustomerContext,
  UsageCreditHold,
} from "@/server/billing/types";

let localProvider: Promise<BillingProviderApi> | undefined;
let autumnProvider: Promise<BillingProviderApi> | undefined;

/**
 * The billing seam every caller goes through. Which implementation answers is
 * decided per call by BILLING_PROVIDER (see ./provider.ts): Autumn, the hosted
 * default (./autumn-subscription.ts, upstream's billing code), or this
 * deployment's own plans tables (./local).
 *
 * Both imports are dynamic so a deployment only ever loads the provider it
 * uses — the local provider keeps the database client out of an Autumn one.
 */
function provider(): Promise<BillingProviderApi> {
  return isLocalBillingProvider().then((local) =>
    local
      ? (localProvider ??= import("@/server/billing/local/subscription"))
      : (autumnProvider ??= import("@/server/billing/autumn-subscription")),
  );
}

type Api = BillingProviderApi;

export async function getOrCreateOrganizationCustomer(
  ...args: Parameters<Api["getOrCreateOrganizationCustomer"]>
) {
  return (await provider()).getOrCreateOrganizationCustomer(...args);
}

export async function customerHasPaidPlan(
  ...args: Parameters<Api["customerHasPaidPlan"]>
) {
  return (await provider()).customerHasPaidPlan(...args);
}

export async function listGrantedFeatureKeys(
  ...args: Parameters<Api["listGrantedFeatureKeys"]>
) {
  return (await provider()).listGrantedFeatureKeys(...args);
}

export async function getUsageCreditsRemaining(
  ...args: Parameters<Api["getUsageCreditsRemaining"]>
) {
  return (await provider()).getUsageCreditsRemaining(...args);
}

export async function checkUsageCreditsDepleted(
  ...args: Parameters<Api["checkUsageCreditsDepleted"]>
) {
  return (await provider()).checkUsageCreditsDepleted(...args);
}

export async function holdCredits(...args: Parameters<Api["holdCredits"]>) {
  return (await provider()).holdCredits(...args);
}

export async function reserveUsageCredits(
  ...args: Parameters<Api["reserveUsageCredits"]>
) {
  return (await provider()).reserveUsageCredits(...args);
}

export async function finalizeHold(...args: Parameters<Api["finalizeHold"]>) {
  return (await provider()).finalizeHold(...args);
}

export async function settleUsageCredits(
  ...args: Parameters<Api["settleUsageCredits"]>
) {
  return (await provider()).settleUsageCredits(...args);
}

export async function trackUsageCreditSpend(
  ...args: Parameters<Api["trackUsageCreditSpend"]>
) {
  return (await provider()).trackUsageCreditSpend(...args);
}
