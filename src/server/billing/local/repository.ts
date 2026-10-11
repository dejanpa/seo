import { and, asc, desc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { runBatch } from "@/db/runBatch";
import {
  creditLedgerEntries,
  organizationSubscriptions,
  planFeatures,
  plans,
} from "@/db/schema";
import { addOneMonth } from "@/server/billing/local/period";
import { LocalPlanAdminRepository } from "@/server/billing/local/plan-admin-repository";

type PlanRow = typeof plans.$inferSelect;

type LedgerEntryInput = {
  organizationId: string;
  kind: "period_grant" | "spend" | "admin_adjustment" | "plan_change";
  monthlyDelta?: number;
  topupDelta?: number;
  creditFeature?: string | null;
  costUsd?: number | null;
  actorUserId?: string | null;
  note?: string | null;
};

const nowIso = () => new Date().toISOString();

function ledgerValues(entry: LedgerEntryInput) {
  return {
    id: crypto.randomUUID(),
    organizationId: entry.organizationId,
    kind: entry.kind,
    monthlyDelta: entry.monthlyDelta ?? 0,
    topupDelta: entry.topupDelta ?? 0,
    creditFeature: entry.creditFeature ?? null,
    costUsd: entry.costUsd ?? null,
    actorUserId: entry.actorUserId ?? null,
    note: entry.note ?? null,
  };
}

async function listPlans(options: { includeArchived?: boolean } = {}) {
  return db
    .select()
    .from(plans)
    .where(options.includeArchived ? undefined : isNull(plans.archivedAt))
    .orderBy(asc(plans.sortOrder), asc(plans.name));
}

async function getPlanById(planId: string) {
  const [row] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, planId))
    .limit(1);
  return row ?? null;
}

async function getPlanBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(plans)
    .where(eq(plans.slug, slug))
    .limit(1);
  return row ?? null;
}

/**
 * The plan new organizations land on. Falls back to the lowest-sorted active
 * plan so a deployment whose operator forgot to flag a default still resolves
 * one instead of failing every request.
 */
async function getDefaultPlan() {
  const [flagged] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.isDefault, true), isNull(plans.archivedAt)))
    .limit(1);
  if (flagged) return flagged;

  const [fallback] = await db
    .select()
    .from(plans)
    .where(isNull(plans.archivedAt))
    .orderBy(asc(plans.sortOrder), asc(plans.name))
    .limit(1);
  return fallback ?? null;
}

async function listPlanFeatureKeys(planId: string) {
  const rows = await db
    .select({ featureKey: planFeatures.featureKey })
    .from(planFeatures)
    .where(eq(planFeatures.planId, planId));
  return rows.map((row) => row.featureKey);
}

async function listFeatureKeysForPlans(planIds: string[]) {
  if (planIds.length === 0) return new Map<string, string[]>();
  const rows = await db
    .select({
      planId: planFeatures.planId,
      featureKey: planFeatures.featureKey,
    })
    .from(planFeatures)
    .where(inArray(planFeatures.planId, planIds));

  const byPlan = new Map<string, string[]>();
  for (const row of rows) {
    const existing = byPlan.get(row.planId);
    if (existing) existing.push(row.featureKey);
    else byPlan.set(row.planId, [row.featureKey]);
  }
  return byPlan;
}

async function getSubscription(organizationId: string) {
  const [row] = await db
    .select()
    .from(organizationSubscriptions)
    .where(eq(organizationSubscriptions.organizationId, organizationId))
    .limit(1);
  return row ?? null;
}

/**
 * Create the subscription row for an organization that has none, on the default
 * plan with its first period's credits granted. Concurrent callers race
 * harmlessly: the loser's insert is ignored and it reads the winner's row.
 */
async function createSubscription(args: {
  organizationId: string;
  plan: PlanRow;
}) {
  const start = nowIso();
  const values = {
    organizationId: args.organizationId,
    planId: args.plan.id,
    status: "active",
    currentPeriodStart: start,
    currentPeriodEnd: addOneMonth(start),
    monthlyRemaining: args.plan.monthlyCredits,
    topupRemaining: 0,
  };

  await runBatch((tx) => [
    tx.insert(organizationSubscriptions).values(values).onConflictDoNothing(),
    tx.insert(creditLedgerEntries).values(
      ledgerValues({
        organizationId: args.organizationId,
        kind: "period_grant",
        monthlyDelta: args.plan.monthlyCredits,
        note: `Initial grant on plan ${args.plan.slug}`,
      }),
    ),
  ]);

  return (await getSubscription(args.organizationId)) ?? null;
}

/**
 * Roll an expired billing period forward and re-grant the plan's monthly
 * credits. Guarded by `current_period_end <= now` in the WHERE clause so two
 * concurrent requests cannot double-grant: the second one matches no row.
 * Unused monthly credits do not carry over; top-up credits are untouched.
 */
async function rollExpiredPeriod(args: {
  organizationId: string;
  plan: PlanRow;
  currentPeriodEnd: string;
}) {
  const now = nowIso();
  const updated = await db
    .update(organizationSubscriptions)
    .set({
      currentPeriodStart: args.currentPeriodEnd,
      currentPeriodEnd: addOneMonth(args.currentPeriodEnd),
      monthlyRemaining: args.plan.monthlyCredits,
      updatedAt: now,
    })
    .where(
      and(
        eq(organizationSubscriptions.organizationId, args.organizationId),
        lte(organizationSubscriptions.currentPeriodEnd, now),
      ),
    )
    .returning();

  if (updated.length > 0) {
    await db.insert(creditLedgerEntries).values(
      ledgerValues({
        organizationId: args.organizationId,
        kind: "period_grant",
        monthlyDelta: args.plan.monthlyCredits,
        note: `Period renewal on plan ${args.plan.slug}`,
      }),
    );
  }

  return updated[0] ?? (await getSubscription(args.organizationId));
}

export type CreditPool = "monthly" | "topup";

function poolColumn(pool: CreditPool) {
  return pool === "monthly"
    ? organizationSubscriptions.monthlyRemaining
    : organizationSubscriptions.topupRemaining;
}

/**
 * Hold credits for a provider call on one pool, but only if that balance is
 * still the one the caller read: a compare-and-set, so concurrent holds cannot
 * both spend the same credits. Returns false when another write got there
 * first and the caller should re-read and retry. The ledger row's id is the
 * hold's lockId, so settleHold can find it.
 *
 * The ledger row follows the update rather than sharing a batch with it,
 * because neither D1 nor Postgres can make an insert conditional on another
 * statement's match count. A crash between the two leaves credits held with no
 * ledger row: the customer is never under-charged, only over-held.
 */
async function holdCredits(args: {
  lockId: string;
  organizationId: string;
  pool: CreditPool;
  expected: number;
  credits: number;
  creditFeature: string | null;
}): Promise<boolean> {
  const column = poolColumn(args.pool);
  const held = await db
    .update(organizationSubscriptions)
    .set({
      [args.pool === "monthly" ? "monthlyRemaining" : "topupRemaining"]:
        args.expected - args.credits,
      updatedAt: nowIso(),
    })
    .where(
      and(
        eq(organizationSubscriptions.organizationId, args.organizationId),
        eq(column, args.expected),
      ),
    )
    .returning({ organizationId: organizationSubscriptions.organizationId });
  if (held.length === 0) return false;

  await db.insert(creditLedgerEntries).values({
    ...ledgerValues({
      organizationId: args.organizationId,
      kind: "spend",
      [args.pool === "monthly" ? "monthlyDelta" : "topupDelta"]: -args.credits,
      creditFeature: args.creditFeature,
      note: "Held for a provider call",
    }),
    id: args.lockId,
  });
  return true;
}

/**
 * Settle a hold: return `refund` credits to the pool it was taken from (a
 * negative refund charges a shortfall there). The settlement row's id is
 * derived from the hold's, so a repeated settle inserts nothing and changes no
 * balance. The row goes first: a crash before the balance update leaves the
 * customer over-held, never refunded twice.
 */
async function settleHold(args: {
  lockId: string;
  pool: CreditPool;
  refund: number;
  creditFeature: string | null;
  costUsd: number | null;
}) {
  const [holdRow] = await db
    .select({ organizationId: creditLedgerEntries.organizationId })
    .from(creditLedgerEntries)
    .where(eq(creditLedgerEntries.id, args.lockId));
  if (!holdRow) throw new Error(`No credit hold ${args.lockId}`);

  const inserted = await db
    .insert(creditLedgerEntries)
    .values({
      ...ledgerValues({
        organizationId: holdRow.organizationId,
        kind: "spend",
        [args.pool === "monthly" ? "monthlyDelta" : "topupDelta"]: args.refund,
        creditFeature: args.creditFeature,
        costUsd: args.costUsd,
        note: "Settled a provider call",
      }),
      id: `${args.lockId}:settle`,
    })
    .onConflictDoNothing()
    .returning({ id: creditLedgerEntries.id });
  if (inserted.length === 0 || args.refund === 0) return;

  const column = poolColumn(args.pool);
  await db
    .update(organizationSubscriptions)
    .set({
      [args.pool === "monthly" ? "monthlyRemaining" : "topupRemaining"]:
        sql`${column} + ${args.refund}`,
      updatedAt: nowIso(),
    })
    .where(
      eq(organizationSubscriptions.organizationId, holdRow.organizationId),
    );
}

/**
 * Deduct a spend and record it. The balance columns are updated with SQL
 * arithmetic rather than a read-modify-write so concurrent spends cannot lose
 * each other's deductions.
 */
async function recordSpend(args: {
  organizationId: string;
  monthlyDeduct: number;
  topupDeduct: number;
  creditFeature: string;
  costUsd: number;
}) {
  await runBatch((tx) => [
    tx
      .update(organizationSubscriptions)
      .set({
        monthlyRemaining: sql`${organizationSubscriptions.monthlyRemaining} - ${args.monthlyDeduct}`,
        topupRemaining: sql`${organizationSubscriptions.topupRemaining} - ${args.topupDeduct}`,
        updatedAt: nowIso(),
      })
      .where(eq(organizationSubscriptions.organizationId, args.organizationId)),
    tx.insert(creditLedgerEntries).values(
      ledgerValues({
        organizationId: args.organizationId,
        kind: "spend",
        monthlyDelta: -args.monthlyDeduct,
        topupDelta: -args.topupDeduct,
        creditFeature: args.creditFeature,
        costUsd: args.costUsd,
      }),
    ),
  ]);
}

async function listLedgerEntries(organizationId: string, limit = 100) {
  return db
    .select()
    .from(creditLedgerEntries)
    .where(eq(creditLedgerEntries.organizationId, organizationId))
    .orderBy(desc(creditLedgerEntries.createdAt), desc(creditLedgerEntries.id))
    .limit(limit);
}

// ---------------------------------------------------------------------------
// Operator writes. Only the admin console calls these; the request hot path
// above never mutates plans.
// ---------------------------------------------------------------------------

/**
 * Move an organization onto a plan. `resetCredits` starts a fresh period with
 * the new plan's allowance (the usual upgrade/downgrade behaviour); without it
 * the balances and period window are left alone, which is what an operator
 * wants when only correcting which plan a workspace is recorded on.
 */
async function assignPlan(args: {
  organizationId: string;
  plan: PlanRow;
  resetCredits: boolean;
  actorUserId: string;
  note?: string | null;
}) {
  const now = nowIso();
  const periodFields = args.resetCredits
    ? {
        currentPeriodStart: now,
        currentPeriodEnd: addOneMonth(now),
        monthlyRemaining: args.plan.monthlyCredits,
      }
    : {};

  await runBatch((tx) => [
    tx
      .update(organizationSubscriptions)
      .set({ planId: args.plan.id, ...periodFields, updatedAt: now })
      .where(eq(organizationSubscriptions.organizationId, args.organizationId)),
    tx.insert(creditLedgerEntries).values(
      ledgerValues({
        organizationId: args.organizationId,
        kind: "plan_change",
        monthlyDelta: args.resetCredits ? args.plan.monthlyCredits : 0,
        actorUserId: args.actorUserId,
        note: args.note ?? `Moved to plan ${args.plan.slug}`,
      }),
    ),
  ]);
}

/** Operator credit grant or clawback. Deltas are signed. */
async function adjustCredits(args: {
  organizationId: string;
  monthlyDelta: number;
  topupDelta: number;
  actorUserId: string;
  note?: string | null;
}) {
  await runBatch((tx) => [
    tx
      .update(organizationSubscriptions)
      .set({
        monthlyRemaining: sql`${organizationSubscriptions.monthlyRemaining} + ${args.monthlyDelta}`,
        topupRemaining: sql`${organizationSubscriptions.topupRemaining} + ${args.topupDelta}`,
        updatedAt: nowIso(),
      })
      .where(eq(organizationSubscriptions.organizationId, args.organizationId)),
    tx.insert(creditLedgerEntries).values(
      ledgerValues({
        organizationId: args.organizationId,
        kind: "admin_adjustment",
        monthlyDelta: args.monthlyDelta,
        topupDelta: args.topupDelta,
        actorUserId: args.actorUserId,
        note: args.note ?? null,
      }),
    ),
  ]);
}

async function setSubscriptionStatus(args: {
  organizationId: string;
  status: "active" | "suspended";
  actorUserId: string;
  note?: string | null;
}) {
  await runBatch((tx) => [
    tx
      .update(organizationSubscriptions)
      .set({ status: args.status, updatedAt: nowIso() })
      .where(eq(organizationSubscriptions.organizationId, args.organizationId)),
    tx.insert(creditLedgerEntries).values(
      ledgerValues({
        organizationId: args.organizationId,
        kind: "admin_adjustment",
        actorUserId: args.actorUserId,
        note: args.note ?? `Workspace ${args.status}`,
      }),
    ),
  ]);
}

export const LocalBillingRepository = {
  ...LocalPlanAdminRepository,
  listPlans,
  getPlanById,
  getPlanBySlug,
  getDefaultPlan,
  listPlanFeatureKeys,
  listFeatureKeysForPlans,
  getSubscription,
  createSubscription,
  rollExpiredPeriod,
  holdCredits,
  settleHold,
  recordSpend,
  listLedgerEntries,
  assignPlan,
  adjustCredits,
  setSubscriptionStatus,
  nowIso,
} as const;
