import {
  creditFeatureLabel,
  type CreditFeature,
} from "./billing-credit-features";

// Access flags. These carry the same meaning they had under Autumn, so the
// existing gates (`customerHasManagedAccess`, `customerHasPaidPlan`) keep
// working unchanged whichever billing provider is active.
const ACCESS_FEATURE_KEYS = [
  // Floor for using the managed service at all.
  "managed_service_access",
  // Paid-only capabilities (scheduled rank checks, AI search, audits).
  "paid_plan",
] as const;

// Per-tool entitlements. An organization whose plan omits one of these is
// refused before any provider spend happens, which is what makes a plan able to
// say "this tier does not get backlinks" rather than only "this tier gets N
// credits".
export const TOOL_FEATURE_KEYS = [
  "keyword_research",
  "domain_overview",
  "backlinks",
  "site_audit",
  "rank_tracking",
  "ai_citations",
  "ai_prompt_responses",
  "local_seo",
  "agent",
] as const satisfies readonly CreditFeature[];

export const PLAN_FEATURE_KEYS = [
  ...ACCESS_FEATURE_KEYS,
  ...TOOL_FEATURE_KEYS,
] as const;

export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number];
type ToolFeatureKey = (typeof TOOL_FEATURE_KEYS)[number];

const TOOL_FEATURE_KEY_SET: ReadonlySet<ToolFeatureKey> = new Set(
  TOOL_FEATURE_KEYS,
);

export function isPlanFeatureKey(value: string): value is PlanFeatureKey {
  return (PLAN_FEATURE_KEYS as readonly string[]).includes(value);
}

/**
 * Onboarding spend happens during signup, before the user has a plan they could
 * have been granted features on. Gating it would lock new users out of the very
 * flow that assigns them a plan, so it is deliberately not a toggleable key.
 */
export function toolFeatureKeyFor(
  feature: CreditFeature,
): ToolFeatureKey | null {
  for (const key of TOOL_FEATURE_KEY_SET) {
    if (key === feature) return key;
  }
  return null;
}

const ACCESS_FEATURE_LABELS: Record<string, string> = {
  managed_service_access: "Service access",
  paid_plan: "Paid plan",
};

/** Accepts any key so callers can label feature keys read back from the
 *  database without narrowing them first. */
export function planFeatureLabel(key: string) {
  return ACCESS_FEATURE_LABELS[key] ?? creditFeatureLabel(key);
}
