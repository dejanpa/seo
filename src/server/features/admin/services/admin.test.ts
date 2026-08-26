import { beforeEach, describe, expect, it, vi } from "vitest";

const adminRepository = vi.hoisted(() => ({
  getUserById: vi.fn(),
  setUserRole: vi.fn(),
  countAdmins: vi.fn(),
  listWorkspaces: vi.fn(),
  countWorkspaces: vi.fn(),
  getWorkspace: vi.fn(),
  listWorkspaceProjects: vi.fn(),
  findOrganizationIdForUser: vi.fn(),
}));

const billingRepository = vi.hoisted(() => ({
  getPlanById: vi.fn(),
  getPlanBySlug: vi.fn(),
  getSubscription: vi.fn(),
  createSubscription: vi.fn(),
  assignPlan: vi.fn(),
  adjustCredits: vi.fn(),
  setSubscriptionStatus: vi.fn(),
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  setPlanFeatures: vi.fn(),
  listPlans: vi.fn(),
  listFeatureKeysForPlans: vi.fn(),
  listPlanFeatureKeys: vi.fn(),
  listLedgerEntries: vi.fn(),
}));

const isLocalBillingProvider = vi.hoisted(() => vi.fn());
const getOptionalEnvValue = vi.hoisted(() => vi.fn());

vi.mock("@/server/features/admin/repositories/AdminRepository", () => ({
  AdminRepository: adminRepository,
}));
vi.mock("@/server/billing/local/repository", () => ({
  LocalBillingRepository: billingRepository,
}));
vi.mock("@/server/billing/provider", () => ({ isLocalBillingProvider }));
vi.mock("@/server/lib/runtime-env", () => ({ getOptionalEnvValue }));

import { assignPlan, setUserAdmin } from "./admin";

describe("setUserAdmin", () => {
  beforeEach(() => {
    getOptionalEnvValue.mockResolvedValue(undefined);
    adminRepository.getUserById.mockResolvedValue({
      id: "u_1",
      email: "person@example.com",
      role: "admin",
    });
    adminRepository.countAdmins.mockResolvedValue(2);
  });

  it("promotes a user", async () => {
    adminRepository.getUserById.mockResolvedValue({
      id: "u_2",
      email: "new@example.com",
      role: null,
    });

    await setUserAdmin({ userId: "u_2", isAdmin: true });

    expect(adminRepository.setUserRole).toHaveBeenCalledWith("u_2", "admin");
  });

  // An empty admin set locks the console for everyone, and only an
  // ADMIN_EMAILS entry could recover it.
  it("refuses to demote the last admin", async () => {
    adminRepository.countAdmins.mockResolvedValue(1);

    await expect(
      setUserAdmin({ userId: "u_1", isAdmin: false }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(adminRepository.setUserRole).not.toHaveBeenCalled();
  });

  it("refuses to demote an ADMIN_EMAILS bootstrap admin", async () => {
    getOptionalEnvValue.mockResolvedValue("Person@Example.com");

    await expect(
      setUserAdmin({ userId: "u_1", isAdmin: false }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("plan administration under Autumn", () => {
  // Writing plan rows on a deployment whose entitlements come from Autumn would
  // silently do nothing, so the console refuses instead.
  it("refuses to assign a plan", async () => {
    isLocalBillingProvider.mockResolvedValue(false);

    await expect(
      assignPlan(
        { organizationId: "org_1", planId: "plan_1", resetCredits: true },
        "u_1",
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(billingRepository.assignPlan).not.toHaveBeenCalled();
  });
});
