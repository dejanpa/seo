import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { organization, user } from "./better-auth-schema";

// Subscription plans owned by this deployment. Under BILLING_PROVIDER=local
// these rows — not an external billing vendor — are the source of truth for
// what an organization may do and how many credits it holds.
export const plans = sqliteTable(
  "plans",
  {
    id: text("id").primaryKey(),
    // Stable operator-facing handle ("free", "pro"). Referenced by seeds and
    // support scripts, so it is unique and never reused after archiving.
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    // Credits granted at the start of every billing period. The period rolls
    // lazily on first read after it expires, so this is also the effective
    // monthly allowance.
    monthlyCredits: integer("monthly_credits").notNull().default(0),
    // Display-only: nothing charges a card, an operator assigns plans by hand.
    priceUsdCents: integer("price_usd_cents").notNull().default(0),
    // Plan handed to organizations that have no subscription row yet. Exactly
    // one plan holds this; PlanRepository clears the flag on the others inside
    // the same write rather than relying on a partial unique index, which the
    // two dialects spell differently.
    isDefault: integer("is_default", { mode: "boolean" })
      .notNull()
      .default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    // Soft delete: archived plans disappear from the picker but stay joinable
    // for organizations still sitting on them.
    archivedAt: text("archived_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index("plans_sort_order_idx").on(table.sortOrder)],
);

// Feature keys a plan unlocks, one row per granted key. Absence of a row is a
// denial, so a new plan starts with nothing until an operator grants it.
export const planFeatures = sqliteTable(
  "plan_features",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    featureKey: text("feature_key").notNull(),
  },
  (table) => [
    uniqueIndex("plan_features_unique_plan_feature").on(
      table.planId,
      table.featureKey,
    ),
  ],
);

// One row per organization: which plan it is on, and its live credit balances.
// Balances live here rather than in their own table because every read and
// write touches them together with the period window.
export const organizationSubscriptions = sqliteTable(
  "organization_subscriptions",
  {
    organizationId: text("organization_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Plans are archived, never deleted, so a delete that would strand
    // subscriptions is rejected outright. (Also keeps the two dialects
    // reporting the same onDelete action — see schema-parity.test.ts.)
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    // "active" | "suspended". A suspended organization keeps its data and
    // balances but fails every entitlement check.
    status: text("status").notNull().default("active"),
    currentPeriodStart: text("current_period_start").notNull(),
    currentPeriodEnd: text("current_period_end").notNull(),
    // Monthly allowance for the current period; reset to the plan's grant when
    // the period rolls. Top-up credits are operator-granted and roll over.
    monthlyRemaining: integer("monthly_remaining").notNull().default(0),
    topupRemaining: integer("topup_remaining").notNull().default(0),
    // Free-text operator note ("annual deal, invoiced manually").
    note: text("note"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index("organization_subscriptions_plan_idx").on(table.planId)],
);

// Append-only audit of every credit movement. Nothing reads it to compute a
// balance — it exists so an operator can answer "where did the credits go".
export const creditLedgerEntries = sqliteTable(
  "credit_ledger_entries",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // "period_grant" | "spend" | "admin_adjustment" | "plan_change"
    kind: text("kind").notNull(),
    // Signed: negative for spend, positive for grants.
    monthlyDelta: integer("monthly_delta").notNull().default(0),
    topupDelta: integer("topup_delta").notNull().default(0),
    // Set for kind = "spend": which product feature burned the credits and what
    // the upstream provider actually charged us.
    creditFeature: text("credit_feature"),
    costUsd: real("cost_usd"),
    // Set for operator-initiated entries. Kept on user deletion so the audit
    // trail survives, hence no cascade.
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("credit_ledger_entries_organization_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);
