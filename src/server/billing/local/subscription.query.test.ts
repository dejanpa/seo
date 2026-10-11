import { readFileSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type * as SubscriptionModule from "./subscription";

// Real in-memory SQLite so the hold's compare-and-set runs against actual SQL:
// the property that stops concurrent calls from spending past the balance is
// in the WHERE clause, which a mocked repository cannot see.

vi.mock("cloudflare:workers", () => ({
  env: { DATABASE_PROVIDER: "d1" },
}));
vi.mock("@/server/lib/posthog", () => ({ captureServerEvent: vi.fn() }));

const ORG = "org_1";
const CUSTOMER = { organizationId: ORG, userEmail: "a@b.c", userId: "u_1" };
// Raw USD that converts to exactly 40 / 10 credits after the 1.28 markup.
const FORTY_CREDITS_USD = 40 / 1280;
const TEN_CREDITS_USD = 10 / 1280;

let client: Client;
let billing: typeof SubscriptionModule;

async function balance() {
  const result = await client.execute(
    "SELECT monthly_remaining, topup_remaining FROM organization_subscriptions",
  );
  return result.rows[0];
}

beforeAll(async () => {
  client = createClient({ url: "file::memory:" });
  const testDb = drizzle(client);
  vi.doMock("@/db", () => ({ db: testDb }));

  vi.doMock("@/db/runBatch", () => ({
    runBatch: async (
      build: (tx: typeof testDb) => readonly Promise<unknown>[],
    ) => {
      for (const statement of build(testDb)) await statement;
    },
  }));

  // Tables come from the real migration so the test cannot drift from
  // production DDL; stub auth tables satisfy its FKs and ALTERs.
  await client.executeMultiple(
    [
      "CREATE TABLE organization (id text PRIMARY KEY);",
      "CREATE TABLE user (id text PRIMARY KEY);",
      "CREATE TABLE session (id text PRIMARY KEY);",
      `INSERT INTO organization (id) VALUES ('${ORG}');`,
      ...readFileSync("drizzle/0043_plans_and_admin.sql", "utf8").split(
        "--> statement-breakpoint",
      ),
      "INSERT INTO plans (id, slug, name, monthly_credits) VALUES ('plan_1', 'pro', 'Pro', 100);",
    ].join("\n"),
  );

  billing = await import("./subscription");
});

afterAll(() => {
  client.close();
});

beforeEach(async () => {
  await client.executeMultiple(`
    DELETE FROM organization_subscriptions;
    DELETE FROM credit_ledger_entries;
    INSERT INTO organization_subscriptions
      (organization_id, plan_id, current_period_start, current_period_end, monthly_remaining, topup_remaining)
      VALUES ('${ORG}', 'plan_1', '2026-01-01T00:00:00.000Z', '2999-01-01T00:00:00.000Z', 100, 0);
  `);
});

describe("local billing credit holds", () => {
  it("never lets concurrent calls hold more than the balance", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        billing.reserveUsageCredits({
          customerId: ORG,
          estimateUsd: FORTY_CREDITS_USD,
        }),
      ),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    expect(await balance()).toMatchObject({
      monthly_remaining: 20,
      topup_remaining: 0,
    });
  });

  it("returns the unused part of a hold when the call costs less", async () => {
    const hold = await billing.reserveUsageCredits({
      customerId: ORG,
      estimateUsd: FORTY_CREDITS_USD,
    });
    await billing.settleUsageCredits({
      customer: CUSTOMER,
      hold,
      creditFeature: "keyword_research",
      costUsd: TEN_CREDITS_USD,
    });

    expect(await balance()).toMatchObject({ monthly_remaining: 90 });
    const ledger = await client.execute(
      "SELECT SUM(monthly_delta) AS spent FROM credit_ledger_entries",
    );
    expect(ledger.rows[0]).toMatchObject({ spent: -10 });
  });
});
