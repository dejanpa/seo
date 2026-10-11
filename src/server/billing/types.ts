import type {
  AUTUMN_SEO_DATA_BALANCE_FEATURE_ID,
  AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
} from "@/shared/billing";
import type { EnsuredUserContext } from "@/middleware/ensure-user/types";
import type * as AutumnProvider from "@/server/billing/autumn-subscription";

// Leaf module so both billing providers and the dispatcher can share these
// types without importing each other.
export type BillingCustomerContext = Pick<
  EnsuredUserContext,
  "organizationId" | "userEmail" | "userId"
> & {
  projectId?: string;
};

export type UsageCreditFeatureId =
  | typeof AUTUMN_SEO_DATA_BALANCE_FEATURE_ID
  | typeof AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID;

export type UsageCreditHold = {
  lockId: string;
  featureId: UsageCreditFeatureId;
  estimatedCredits: number;
  /** Indexes of the reserved provider calls this hold covers. */
  callIndexes: readonly number[];
};

/**
 * The contract both billing providers implement, taken from the Autumn
 * provider's own signatures (it tracks upstream open-seo). When upstream
 * changes one, the local provider stops typechecking at the dispatcher instead
 * of drifting at runtime.
 */
export type BillingProviderApi = Pick<
  typeof AutumnProvider,
  | "getOrCreateOrganizationCustomer"
  | "customerHasPaidPlan"
  | "listGrantedFeatureKeys"
  | "getUsageCreditsRemaining"
  | "checkUsageCreditsDepleted"
  | "holdCredits"
  | "reserveUsageCredits"
  | "finalizeHold"
  | "settleUsageCredits"
  | "trackUsageCreditSpend"
>;
