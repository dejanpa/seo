import { beforeEach, describe, expect, it, vi } from "vitest";
import { creditsForProviderUsd } from "@/shared/billing";

const repository = vi.hoisted(() => ({
  getSubscription: vi.fn(),
  getPlanById: vi.fn(),
  getDefaultPlan: vi.fn(),
  createSubscription: vi.fn(),
  rollExpiredPeriod: vi.fn(),
  listPlanFeatureKeys: vi.fn(),
  holdCredits: vi.fn(),
  recordSpend: vi.fn(),
  nowIso: () => "2026-06-01T00:00:00.000Z",
}));

vi.mock("@/server/billing/local/repository", () => ({
  LocalBillingRepository: repository,
}));

vi.mock("@/server/lib/posthog", () => ({ captureServerEvent: vi.fn() }));

import {
  customerHasPaidPlan,
  reserveUsageCredits,
  trackUsageCreditSpend,
} from "./subscription";

const PLAN = {
  id: "plan_pro",
  slug: "pro",
  monthlyCredits: 10_000,
};

const ORG = "org_1";

const CUSTOMER = { organizationId: ORG, userEmail: "a@b.c", userId: "u_1" };

const reserve = (
  creditFeature: Parameters<typeof reserveUsageCredits>[0]["creditFeature"],
) =>
  reserveUsageCredits({
    customer: CUSTOMER,
    customerId: ORG,
    callCredits: [10],
    creditFeature,
  });

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
    repository.holdCredits.mockResolvedValue(true);
  });

  it("refuses a feature the plan does not grant", async () => {
    await expect(reserve("backlinks")).rejects.toMatchObject({
      code: "PAYMENT_REQUIRED",
    });
  });

  it("allows a feature the plan grants", async () => {
    await expect(reserve("keyword_research")).resolves.toMatchObject({
      refusedCalls: [],
    });
  });

  it("refuses everything while the workspace is suspended", async () => {
    repository.getSubscription.mockResolvedValue(
      subscription({ status: "suspended" }),
    );

    await expect(reserve("keyword_research")).rejects.toMatchObject({
      code: "PAYMENT_REQUIRED",
    });
    await expect(customerHasPaidPlan(ORG)).resolves.toBe(false);
  });

  it("refuses when both credit balances are exhausted", async () => {
    repository.getSubscription.mockResolvedValue(
      subscription({ monthlyRemaining: 0, topupRemaining: 0 }),
    );

    await expect(reserve("keyword_research")).rejects.toMatchObject({
      code: "INSUFFICIENT_CREDITS",
    });
  });

  it("still serves a workspace whose monthly credits ran out but has top-up left", async () => {
    repository.getSubscription.mockResolvedValue(
      subscription({ monthlyRemaining: 0, topupRemaining: 900 }),
    );

    await expect(reserve("keyword_research")).resolves.toMatchObject({
      holds: [{ featureId: "topup_credits" }],
    });
  });

  it("renews an expired period before answering", async () => {
    const renewed = subscription({ monthlyRemaining: PLAN.monthlyCredits });
    repository.getSubscription
      .mockResolvedValueOnce(
        subscription({
          currentPeriodEnd: "2026-05-15T00:00:00.000Z",
          monthlyRemaining: 0,
        }),
      )
      .mockResolvedValue(renewed);
    repository.rollExpiredPeriod.mockResolvedValue(renewed);

    await expect(reserve("keyword_research")).resolves.toMatchObject({
      holds: [{ featureId: "usage_credits" }],
    });
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
    const expectedTotal = creditsForProviderUsd(costUsd);

    await trackUsageCreditSpend({
      customer: CUSTOMER,
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
      customer: CUSTOMER,
      customerId: ORG,
      creditFeature: "keyword_research",
      costUsd: 0,
      monthlyRemaining: 1_000,
    });

    expect(repository.recordSpend).not.toHaveBeenCalled();
  });
});
