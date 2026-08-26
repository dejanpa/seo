import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTUMN_SEO_DATA_CREDITS_PER_USD,
  SEO_DATA_COST_MARKUP,
} from "@/shared/billing";

const repository = vi.hoisted(() => ({
  getSubscription: vi.fn(),
  getPlanById: vi.fn(),
  getDefaultPlan: vi.fn(),
  createSubscription: vi.fn(),
  rollExpiredPeriod: vi.fn(),
  listPlanFeatureKeys: vi.fn(),
  recordSpend: vi.fn(),
  nowIso: () => "2026-06-01T00:00:00.000Z",
}));

vi.mock("@/server/billing/local/repository", () => ({
  LocalBillingRepository: repository,
}));

vi.mock("@/server/lib/posthog", () => ({ captureServerEvent: vi.fn() }));

import {
  assertUsageCreditsAvailable,
  customerHasPaidPlan,
  trackUsageCreditSpend,
} from "./subscription";

const PLAN = {
  id: "plan_pro",
  slug: "pro",
  monthlyCredits: 10_000,
};

const ORG = "org_1";

function subscription(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: ORG,
    planId: PLAN.id,
    status: "active",
    currentPeriodStart: "2026-05-15T00:00:00.000Z",
    // Well after repository.nowIso(), so no period roll is attempted.
    currentPeriodEnd: "2026-07-15T00:00:00.000Z",
    monthlyRemaining: 5_000,
    topupRemaining: 0,
    ...overrides,
  };
}

describe("local billing entitlements", () => {
  beforeEach(() => {
    repository.getSubscription.mockResolvedValue(subscription());
    repository.getPlanById.mockResolvedValue(PLAN);
    repository.listPlanFeatureKeys.mockResolvedValue([
      "managed_service_access",
      "paid_plan",
      "keyword_research",
    ]);
  });

  it("refuses a feature the plan does not grant", async () => {
    await expect(
      assertUsageCreditsAvailable(ORG, "backlinks"),
    ).rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
  });

  it("allows a feature the plan grants", async () => {
    await expect(
      assertUsageCreditsAvailable(ORG, "keyword_research"),
    ).resolves.toEqual({ monthlyRemaining: 5_000 });
  });

  // Onboarding spend happens before the user has any plan to be granted
  // features on, so it must never be gated on one.
  it("does not gate onboarding spend on a plan feature", async () => {
    await expect(
      assertUsageCreditsAvailable(ORG, "onboarding"),
    ).resolves.toEqual({ monthlyRemaining: 5_000 });
  });

  it("refuses everything while the workspace is suspended", async () => {
    repository.getSubscription.mockResolvedValue(
      subscription({ status: "suspended" }),
    );

    await expect(
      assertUsageCreditsAvailable(ORG, "keyword_research"),
    ).rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
    await expect(customerHasPaidPlan(ORG)).resolves.toBe(false);
  });

  it("refuses when both credit balances are exhausted", async () => {
    repository.getSubscription.mockResolvedValue(
      subscription({ monthlyRemaining: 0, topupRemaining: 0 }),
    );

    await expect(
      assertUsageCreditsAvailable(ORG, "keyword_research"),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_CREDITS" });
  });

  it("still serves a workspace whose monthly credits ran out but has top-up left", async () => {
    repository.getSubscription.mockResolvedValue(
      subscription({ monthlyRemaining: 0, topupRemaining: 900 }),
    );

    await expect(
      assertUsageCreditsAvailable(ORG, "keyword_research"),
    ).resolves.toEqual({ monthlyRemaining: 0 });
  });

  it("renews an expired period before answering", async () => {
    repository.getSubscription.mockResolvedValue(
      subscription({
        currentPeriodEnd: "2026-05-15T00:00:00.000Z",
        monthlyRemaining: 0,
      }),
    );
    repository.rollExpiredPeriod.mockResolvedValue(
      subscription({ monthlyRemaining: PLAN.monthlyCredits }),
    );

    await expect(
      assertUsageCreditsAvailable(ORG, "keyword_research"),
    ).resolves.toEqual({ monthlyRemaining: PLAN.monthlyCredits });
  });
});

describe("local billing spend", () => {
  beforeEach(() => {
    repository.getSubscription.mockResolvedValue(subscription());
    repository.getPlanById.mockResolvedValue(PLAN);
    repository.listPlanFeatureKeys.mockResolvedValue(["keyword_research"]);
  });

  // Monthly credits expire at the period boundary and top-up credits roll over,
  // so spending monthly first is what keeps a customer's purchased balance.
  it("spends monthly credits before top-up credits", async () => {
    const costUsd = 3;
    const expectedTotal = Math.ceil(
      costUsd * SEO_DATA_COST_MARKUP * AUTUMN_SEO_DATA_CREDITS_PER_USD,
    );

    await trackUsageCreditSpend({
      customer: { organizationId: ORG, userEmail: "a@b.c", userId: "u_1" },
      customerId: ORG,
      creditFeature: "keyword_research",
      costUsd,
      monthlyRemaining: 1_000,
    });

    expect(repository.recordSpend).toHaveBeenCalledWith(
      expect.objectContaining({
        monthlyDeduct: 1_000,
        topupDeduct: expectedTotal - 1_000,
      }),
    );
  });

  it("records nothing for a zero-cost call", async () => {
    await trackUsageCreditSpend({
      customer: { organizationId: ORG, userEmail: "a@b.c", userId: "u_1" },
      customerId: ORG,
      creditFeature: "keyword_research",
      costUsd: 0,
      monthlyRemaining: 1_000,
    });

    expect(repository.recordSpend).not.toHaveBeenCalled();
  });
});
