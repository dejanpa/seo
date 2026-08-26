import { autumnSeoDataCreditsToUsd } from "@/shared/billing";
import { isPlanFeatureKey } from "@/shared/plan-features";
import { LocalBillingRepository } from "@/server/billing/local/repository";
import { isLocalBillingProvider } from "@/server/billing/provider";
import { AdminRepository } from "@/server/features/admin/repositories/AdminRepository";
import {
  roleListIncludesAdmin,
  isBootstrapAdminEmail,
  ADMIN_ROLE,
} from "@/server/features/admin/roles";
import { AppError } from "@/server/lib/errors";

const PAGE_SIZE = 25;
const LOGIN_EVENT_LIMIT = 50;

/**
 * Plans, credits and entitlements only exist in this database under
 * BILLING_PROVIDER=local. Under Autumn they live in the vendor's dashboard, so
 * every mutating admin action refuses rather than writing rows nothing reads.
 */
async function assertLocalBilling() {
  if (!(await isLocalBillingProvider())) {
    throw new AppError(
      "FORBIDDEN",
      "Plan administration requires BILLING_PROVIDER=local. This deployment delegates billing to Autumn.",
    );
  }
}

function requireValidFeatureKeys(featureKeys: readonly string[]) {
  const invalid = featureKeys.filter((key) => !isPlanFeatureKey(key));
  if (invalid.length > 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Unknown plan feature keys: ${invalid.join(", ")}`,
    );
  }
}

async function requirePlan(planId: string) {
  const plan = await LocalBillingRepository.getPlanById(planId);
  if (!plan) throw new AppError("NOT_FOUND", `Unknown plan ${planId}`);
  return plan;
}

async function listWorkspaces(input: { search?: string; page?: number }) {
  const page = Math.max(input.page ?? 1, 1);
  const [rows, total] = await Promise.all([
    AdminRepository.listWorkspaces({
      search: input.search,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    AdminRepository.countWorkspaces(input.search),
  ]);

  return {
    page,
    pageSize: PAGE_SIZE,
    total,
    rows: rows.map((row) => ({
      ...row,
      isAdmin: roleListIncludesAdmin(row.role),
      creditsRemaining: (row.monthlyRemaining ?? 0) + (row.topupRemaining ?? 0),
    })),
  };
}

async function getWorkspaceDetail(organizationId: string) {
  const workspace = await AdminRepository.getWorkspace(organizationId);
  if (!workspace) {
    throw new AppError("NOT_FOUND", `Unknown workspace ${organizationId}`);
  }

  const [projects, ledger, planFeatureKeys, loginEvents] = await Promise.all([
    AdminRepository.listWorkspaceProjects(organizationId),
    LocalBillingRepository.listLedgerEntries(organizationId, 50),
    workspace.planId
      ? LocalBillingRepository.listPlanFeatureKeys(workspace.planId)
      : Promise.resolve([]),
    // Delegated deployments have organizations with no linked user, and so no
    // sign-in history to read.
    workspace.userId
      ? AdminRepository.listLoginEvents(workspace.userId, LOGIN_EVENT_LIMIT)
      : Promise.resolve([]),
  ]);

  return {
    workspace: {
      ...workspace,
      isAdmin: roleListIncludesAdmin(workspace.role),
      creditsRemaining:
        (workspace.monthlyRemaining ?? 0) + (workspace.topupRemaining ?? 0),
      lastLoginAt: loginEvents[0]?.createdAt ?? null,
    },
    planFeatureKeys,
    projects,
    loginEvents,
    ledger: ledger.map((entry) => ({
      ...entry,
      costUsdDisplay: entry.costUsd ?? null,
      creditsDelta: entry.monthlyDelta + entry.topupDelta,
    })),
  };
}

async function listPlans() {
  const rows = await LocalBillingRepository.listPlans({
    includeArchived: true,
  });
  const featuresByPlan = await LocalBillingRepository.listFeatureKeysForPlans(
    rows.map((row) => row.id),
  );

  return rows.map((plan) => ({
    ...plan,
    monthlyCreditsUsd: autumnSeoDataCreditsToUsd(plan.monthlyCredits),
    featureKeys: featuresByPlan.get(plan.id) ?? [],
  }));
}

async function createPlan(input: {
  slug: string;
  name: string;
  description?: string | null;
  monthlyCredits: number;
  priceUsdCents: number;
  sortOrder: number;
  featureKeys: string[];
}) {
  await assertLocalBilling();
  requireValidFeatureKeys(input.featureKeys);

  if (await LocalBillingRepository.getPlanBySlug(input.slug)) {
    throw new AppError("CONFLICT", `A plan with slug "${input.slug}" exists`);
  }

  return { id: await LocalBillingRepository.createPlan(input) };
}

async function updatePlan(input: {
  planId: string;
  name: string;
  description?: string | null;
  monthlyCredits: number;
  priceUsdCents: number;
  sortOrder: number;
  featureKeys: string[];
}) {
  await assertLocalBilling();
  requireValidFeatureKeys(input.featureKeys);
  await requirePlan(input.planId);

  await LocalBillingRepository.updatePlan(input.planId, input);
  await LocalBillingRepository.setPlanFeatures(input.planId, input.featureKeys);
}

async function setDefaultPlan(planId: string) {
  await assertLocalBilling();
  const plan = await requirePlan(planId);
  if (plan.archivedAt) {
    throw new AppError(
      "VALIDATION_ERROR",
      "An archived plan cannot be the default for new workspaces",
    );
  }
  await LocalBillingRepository.setDefaultPlan(planId);
}

async function setPlanArchived(input: { planId: string; archived: boolean }) {
  await assertLocalBilling();
  const plan = await requirePlan(input.planId);

  if (input.archived) {
    if (plan.isDefault) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Make another plan the default before archiving this one",
      );
    }
    const inUse = await LocalBillingRepository.countSubscriptionsOnPlan(
      input.planId,
    );
    if (inUse > 0) {
      throw new AppError(
        "CONFLICT",
        `${inUse} workspace(s) are still on this plan — move them first`,
      );
    }
  }

  await LocalBillingRepository.setPlanArchived(input.planId, input.archived);
}

async function assignPlan(
  input: {
    organizationId: string;
    planId: string;
    resetCredits: boolean;
    note?: string | null;
  },
  actorUserId: string,
) {
  await assertLocalBilling();
  const plan = await requirePlan(input.planId);

  // A workspace that has never made a billable call has no subscription row to
  // update, so create it on the target plan instead of silently doing nothing.
  const existing = await LocalBillingRepository.getSubscription(
    input.organizationId,
  );
  if (!existing) {
    await LocalBillingRepository.createSubscription({
      organizationId: input.organizationId,
      plan,
    });
    return;
  }

  await LocalBillingRepository.assignPlan({
    organizationId: input.organizationId,
    plan,
    resetCredits: input.resetCredits,
    actorUserId,
    note: input.note,
  });
}

async function adjustCredits(
  input: {
    organizationId: string;
    monthlyDelta: number;
    topupDelta: number;
    note?: string | null;
  },
  actorUserId: string,
) {
  await assertLocalBilling();
  if (input.monthlyDelta === 0 && input.topupDelta === 0) {
    throw new AppError("VALIDATION_ERROR", "Nothing to adjust");
  }
  await LocalBillingRepository.adjustCredits({ ...input, actorUserId });
}

async function setWorkspaceStatus(
  input: {
    organizationId: string;
    status: "active" | "suspended";
    note?: string | null;
  },
  actorUserId: string,
) {
  await assertLocalBilling();
  await LocalBillingRepository.setSubscriptionStatus({ ...input, actorUserId });
}

/**
 * Promote or demote an operator. Demotion refuses to remove the last admin —
 * an empty admin set locks the console for everyone, and only an ADMIN_EMAILS
 * entry could recover it.
 */
async function setUserAdmin(input: { userId: string; isAdmin: boolean }) {
  const target = await AdminRepository.getUserById(input.userId);
  if (!target) throw new AppError("NOT_FOUND", `Unknown user ${input.userId}`);

  if (!input.isAdmin) {
    if (await isBootstrapAdminEmail(target.email)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "This user is an admin via ADMIN_EMAILS — remove them from that variable instead",
      );
    }
    if (
      roleListIncludesAdmin(target.role) &&
      (await AdminRepository.countAdmins()) <= 1
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "This is the last admin — promote someone else first",
      );
    }
  }

  await AdminRepository.setUserRole(
    input.userId,
    input.isAdmin ? ADMIN_ROLE : null,
  );
}

export {
  listWorkspaces,
  getWorkspaceDetail,
  listPlans,
  createPlan,
  updatePlan,
  setDefaultPlan,
  setPlanArchived,
  assignPlan,
  adjustCredits,
  setWorkspaceStatus,
  setUserAdmin,
};
