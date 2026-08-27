import type { CreditFeature } from "@/shared/billing-credit-features";
import type { PlanFeatureKey } from "@/shared/plan-features";
import type { EnsuredUserContext } from "@/middleware/ensure-user/types";

// Leaf module so both billing providers and the dispatcher can share these
// types without importing each other.
export type BillingCustomerContext = Pick<
  EnsuredUserContext,
  "organizationId" | "userEmail" | "userId"
> & {
  projectId?: string;
};

/**
 * The contract both billing providers implement. Written out here (rather than
 * inferred from one of them) so a provider that drifts fails to typecheck at
 * the dispatcher instead of at runtime.
 */
export type BillingProviderApi = {
  getOrCreateOrganizationCustomer(
    context: BillingCustomerContext,
  ): Promise<{ id: string }>;
  customerHasPaidPlan(
    customerId: string,
    opts?: { retryDenied?: boolean },
  ): Promise<boolean>;
  customerHasManagedAccess(customerId: string): Promise<boolean>;
  listGrantedFeatureKeys(
    customerId: string,
  ): Promise<readonly PlanFeatureKey[]>;
  assertUsageCreditsAvailable(
    customerId: string,
    creditFeature?: CreditFeature,
  ): Promise<{ monthlyRemaining: number }>;
  checkUsageCreditsDepleted(
    customer: BillingCustomerContext,
  ): Promise<{ depleted: boolean; monthlyRemaining: number }>;
  trackUsageCreditSpend(args: {
    customer: BillingCustomerContext;
    customerId: string;
    creditFeature: CreditFeature;
    costUsd: number;
    monthlyRemaining: number;
    properties?: Record<string, unknown>;
  }): Promise<void>;
};
