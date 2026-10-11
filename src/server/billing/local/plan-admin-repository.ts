import { eq } from "drizzle-orm";
import { db } from "@/db";
import { runBatch } from "@/db/runBatch";
import { organizationSubscriptions, planFeatures, plans } from "@/db/schema";

// Operator writes to plans. Only the admin console calls these, through
// LocalBillingRepository; the request hot path never mutates plans.

const nowIso = () => new Date().toISOString();

async function createPlan(input: {
  slug: string;
  name: string;
  description?: string | null;
  monthlyCredits: number;
  priceUsdCents: number;
  sortOrder: number;
  featureKeys: readonly string[];
}) {
  const id = crypto.randomUUID();
  await runBatch((tx) => [
    tx.insert(plans).values({
      id,
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      monthlyCredits: input.monthlyCredits,
      priceUsdCents: input.priceUsdCents,
      sortOrder: input.sortOrder,
    }),
    ...input.featureKeys.map((featureKey) =>
      tx
        .insert(planFeatures)
        .values({ id: crypto.randomUUID(), planId: id, featureKey }),
    ),
  ]);
  return id;
}

async function updatePlan(
  planId: string,
  input: {
    name: string;
    description?: string | null;
    monthlyCredits: number;
    priceUsdCents: number;
    sortOrder: number;
  },
) {
  await db
    .update(plans)
    .set({
      name: input.name,
      description: input.description ?? null,
      monthlyCredits: input.monthlyCredits,
      priceUsdCents: input.priceUsdCents,
      sortOrder: input.sortOrder,
      updatedAt: nowIso(),
    })
    .where(eq(plans.id, planId));
}

/** Replaces a plan's granted features wholesale — the admin form submits the
 *  complete set, so a delete-then-insert keeps it simple and idempotent. */
async function setPlanFeatures(planId: string, featureKeys: readonly string[]) {
  await runBatch((tx) => [
    tx.delete(planFeatures).where(eq(planFeatures.planId, planId)),
    ...featureKeys.map((featureKey) =>
      tx
        .insert(planFeatures)
        .values({ id: crypto.randomUUID(), planId, featureKey }),
    ),
  ]);
}

/** Exactly one plan is the default; clearing the others happens in the same
 *  atomic write so a failure cannot leave two (or zero) defaults behind. */
async function setDefaultPlan(planId: string) {
  await runBatch((tx) => [
    tx.update(plans).set({ isDefault: false, updatedAt: nowIso() }),
    tx
      .update(plans)
      .set({ isDefault: true, updatedAt: nowIso() })
      .where(eq(plans.id, planId)),
  ]);
}

async function setPlanArchived(planId: string, archived: boolean) {
  await db
    .update(plans)
    .set({ archivedAt: archived ? nowIso() : null, updatedAt: nowIso() })
    .where(eq(plans.id, planId));
}

async function countSubscriptionsOnPlan(planId: string) {
  const rows = await db
    .select({ organizationId: organizationSubscriptions.organizationId })
    .from(organizationSubscriptions)
    .where(eq(organizationSubscriptions.planId, planId));
  return rows.length;
}

export const LocalPlanAdminRepository = {
  createPlan,
  updatePlan,
  setPlanFeatures,
  setDefaultPlan,
  setPlanArchived,
  countSubscriptionsOnPlan,
} as const;
