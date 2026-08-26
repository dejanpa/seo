import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization, user } from "./better-auth-schema";

// Postgres mirror of ../plans.schema.ts. Same text-timestamp convention as the
// other Postgres tables here (see app.schema.ts for why timestamptz is avoided).
const isoNow = sql`to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
const timestampColumn = (name: string) => text(name);

export const plans = pgTable(
  "plans",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    monthlyCredits: integer("monthly_credits").notNull().default(0),
    priceUsdCents: integer("price_usd_cents").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestampColumn("archived_at"),
    createdAt: timestampColumn("created_at").notNull().default(isoNow),
    updatedAt: timestampColumn("updated_at").notNull().default(isoNow),
  },
  (table) => [index("plans_sort_order_idx").on(table.sortOrder)],
);

export const planFeatures = pgTable(
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

export const organizationSubscriptions = pgTable(
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
    status: text("status").notNull().default("active"),
    currentPeriodStart: timestampColumn("current_period_start").notNull(),
    currentPeriodEnd: timestampColumn("current_period_end").notNull(),
    monthlyRemaining: integer("monthly_remaining").notNull().default(0),
    topupRemaining: integer("topup_remaining").notNull().default(0),
    note: text("note"),
    createdAt: timestampColumn("created_at").notNull().default(isoNow),
    updatedAt: timestampColumn("updated_at").notNull().default(isoNow),
  },
  (table) => [index("organization_subscriptions_plan_idx").on(table.planId)],
);

export const creditLedgerEntries = pgTable(
  "credit_ledger_entries",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    monthlyDelta: integer("monthly_delta").notNull().default(0),
    topupDelta: integer("topup_delta").notNull().default(0),
    creditFeature: text("credit_feature"),
    costUsd: real("cost_usd"),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdAt: timestampColumn("created_at").notNull().default(isoNow),
  },
  (table) => [
    index("credit_ledger_entries_organization_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);
