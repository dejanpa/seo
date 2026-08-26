import { getOptionalEnvValue } from "@/server/lib/runtime-env";

const BILLING_PROVIDERS = ["autumn", "local"] as const;

const warnedInvalidProviders = new Set<string>();

/**
 * Which system owns plans, entitlements and credit balances.
 *
 * - "autumn" (the default when BILLING_PROVIDER is unset): the external Autumn
 *   service, as the hosted deployment has always used.
 * - "local": the `plans` / `organization_subscriptions` / `credit_ledger_entries`
 *   tables in this deployment's own database, administered from /admin.
 */
export async function isLocalBillingProvider() {
  const value = await getOptionalEnvValue("BILLING_PROVIDER");
  if (!value) return false;
  if (value === "local") return true;
  if (value === "autumn") return false;

  // A set-but-invalid value is an operator typo worth hearing about; silently
  // falling back would bill against the wrong system.
  if (!warnedInvalidProviders.has(value)) {
    warnedInvalidProviders.add(value);
    console.error(
      `Invalid BILLING_PROVIDER "${value}" — falling back to "autumn". Valid values: ${BILLING_PROVIDERS.join(", ")}.`,
    );
  }
  return false;
}
