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
/**
 * BILLING_PROVIDER, looked up the way getOptionalEnvValue does (process.env
 * first, then the Workers env) but without importing runtime-env, so the many
 * upstream tests that mock runtime-env, or don't mock cloudflare:workers,
 * keep running on the default Autumn provider.
 */
async function readBillingProviderSetting(): Promise<string | undefined> {
  const fromProcess =
    typeof process !== "undefined" ? process.env?.BILLING_PROVIDER : undefined;
  if (fromProcess) return fromProcess;
  try {
    const workers = await import("cloudflare:workers");
    return workers.env?.BILLING_PROVIDER;
  } catch {
    return undefined;
  }
}

export async function isLocalBillingProvider() {
  const value = await readBillingProviderSetting();
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
