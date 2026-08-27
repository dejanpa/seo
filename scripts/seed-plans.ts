/**
 * Seed the subscription plans that BILLING_PROVIDER=local reads.
 *
 * A local-billing deployment refuses traffic until at least one plan exists
 * (new workspaces are put on the default plan), so run this once after
 * migrating.
 *
 * Local D1:
 *   pnpm db:migrate:local
 *   pnpm seed:plans
 *
 * Hosted Postgres:
 *   POSTGRES_DATABASE_URL=postgres://... pnpm seed:plans --postgres
 *
 * Re-running is safe: plans are matched by slug and existing rows are left
 * alone (their credits and features may have been tuned in /admin). Pass
 * --reset-features to push the feature sets below back over what is there.
 */
import process from "node:process";
import { eq } from "drizzle-orm";
import { loadLocalEnv, parseArgs } from "./cli-utils";
import { TOOL_FEATURE_KEYS } from "../src/shared/plan-features";
// Node-safe raw schema barrels — ../src/db/schema is the provider-aware one and
// imports cloudflare:workers, which Node's loader cannot resolve here.
import * as sqlitePlans from "../src/db/plans.schema";
import * as pgPlans from "../src/db/pg/plans.schema";

loadLocalEnv();

type SeedPlan = {
  slug: string;
  name: string;
  description: string;
  monthlyCredits: number;
  priceUsdCents: number;
  sortOrder: number;
  isDefault: boolean;
  featureKeys: string[];
};

// 1000 credits = $1 of provider spend (AUTUMN_SEO_DATA_CREDITS_PER_USD).
const CREDITS_PER_USD = 1000;

const SEED_PLANS: SeedPlan[] = [
  {
    slug: "free",
    name: "Free",
    description: "Keyword research and domain overview on a small allowance.",
    monthlyCredits: 2 * CREDITS_PER_USD,
    priceUsdCents: 0,
    sortOrder: 0,
    isDefault: true,
    featureKeys: [
      "managed_service_access",
      "keyword_research",
      "domain_overview",
      "search_console",
    ],
  },
  {
    slug: "pro",
    name: "Pro",
    description: "Everything except AI visibility, for a single site owner.",
    monthlyCredits: 25 * CREDITS_PER_USD,
    priceUsdCents: 4900,
    sortOrder: 1,
    isDefault: false,
    featureKeys: [
      "managed_service_access",
      "paid_plan",
      "keyword_research",
      "domain_overview",
      "backlinks",
      "site_audit",
      "rank_tracking",
      "local_seo",
      "agent",
      "agent_skills",
      "search_console",
      "google_analytics",
    ],
  },
  {
    slug: "agency",
    name: "Agency",
    description: "Every feature, with an allowance sized for client work.",
    monthlyCredits: 100 * CREDITS_PER_USD,
    priceUsdCents: 19900,
    sortOrder: 2,
    isDefault: false,
    featureKeys: [
      "managed_service_access",
      "paid_plan",
      ...TOOL_FEATURE_KEYS,
      "agent_skills",
      "search_console",
      "google_analytics",
    ],
  },
];

type Db = {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<{ id: string }[]>;
    };
  };
  insert: (table: unknown) => { values: (values: unknown) => Promise<unknown> };
  delete: (table: unknown) => {
    where: (condition: unknown) => Promise<unknown>;
  };
};

async function seed(
  db: Db,
  tables: {
    plans: typeof sqlitePlans.plans;
    planFeatures: typeof sqlitePlans.planFeatures;
  },
  options: { resetFeatures: boolean },
) {
  for (const plan of SEED_PLANS) {
    const existing = await db
      .select({ id: tables.plans.id })
      .from(tables.plans)
      .where(eq(tables.plans.slug, plan.slug));

    if (existing.length > 0) {
      const planId = existing[0].id;
      if (!options.resetFeatures) {
        console.log(`= ${plan.slug} (exists, left alone)`);
        continue;
      }
      await db
        .delete(tables.planFeatures)
        .where(eq(tables.planFeatures.planId, planId));
      for (const featureKey of plan.featureKeys) {
        await db
          .insert(tables.planFeatures)
          .values({ id: crypto.randomUUID(), planId, featureKey });
      }
      console.log(`~ ${plan.slug} (features reset)`);
      continue;
    }

    const id = crypto.randomUUID();
    await db.insert(tables.plans).values({
      id,
      slug: plan.slug,
      name: plan.name,
      description: plan.description,
      monthlyCredits: plan.monthlyCredits,
      priceUsdCents: plan.priceUsdCents,
      sortOrder: plan.sortOrder,
      isDefault: plan.isDefault,
    });
    for (const featureKey of plan.featureKeys) {
      await db
        .insert(tables.planFeatures)
        .values({ id: crypto.randomUUID(), planId: id, featureKey });
    }
    console.log(`+ ${plan.slug}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const resetFeatures = args["reset-features"] === "true";

  if (args.postgres === "true") {
    const connectionString = process.env.POSTGRES_DATABASE_URL;
    if (!connectionString) {
      throw new Error("POSTGRES_DATABASE_URL is required with --postgres.");
    }
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const client = postgres(connectionString, { max: 1 });
    try {
      const db = drizzle(client, { schema: pgPlans });
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- structurally identical to the sqlite schema (schema-parity.test.ts)
      await seed(
        db as unknown as Db,
        pgPlans as unknown as typeof sqlitePlans,
        {
          resetFeatures,
        },
      );
    } finally {
      await client.end();
    }
    return;
  }

  const { getPlatformProxy } = await import("wrangler");
  const { drizzle } = await import("drizzle-orm/d1");
  const { env, dispose } = await getPlatformProxy<{ DB: D1Database }>();
  try {
    const db = drizzle(env.DB, { schema: sqlitePlans });
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- seed() needs only the narrow surface in Db
    await seed(db as unknown as Db, sqlitePlans, { resetFeatures });
  } finally {
    await dispose();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
