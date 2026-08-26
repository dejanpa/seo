import { createServerFn } from "@tanstack/react-start";
import { AdminService } from "@/server/features/admin/services/AdminService";
import { isLocalBillingProvider } from "@/server/billing/provider";
import { isAdminUser } from "@/server/features/admin/access";
import {
  requireAdminContext,
  requireAuthenticatedContext,
} from "@/serverFunctions/middleware";
import {
  adjustCreditsSchema,
  assignPlanSchema,
  createPlanSchema,
  listWorkspacesSchema,
  planIdActionSchema,
  setPlanArchivedSchema,
  setUserAdminSchema,
  setWorkspaceStatusSchema,
  updatePlanSchema,
  workspaceDetailSchema,
} from "@/types/schemas/admin";

// Readable by any signed-in user: the sidebar needs to know whether to show the
// Admin entry, and answering "no" is not privileged information.
export const getViewerAdminStatus = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) => ({ isAdmin: await isAdminUser(context) }));

export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware(requireAdminContext)
  .handler(async () => ({
    localBilling: await isLocalBillingProvider(),
  }));

export const getAdminWorkspaces = createServerFn({ method: "POST" })
  .middleware(requireAdminContext)
  .validator(listWorkspacesSchema)
  .handler(async ({ data }) => AdminService.listWorkspaces(data));

export const getAdminWorkspaceDetail = createServerFn({ method: "POST" })
  .middleware(requireAdminContext)
  .validator(workspaceDetailSchema)
  .handler(async ({ data }) =>
    AdminService.getWorkspaceDetail(data.organizationId),
  );

export const getAdminPlans = createServerFn({ method: "POST" })
  .middleware(requireAdminContext)
  .handler(async () => AdminService.listPlans());

export const createAdminPlan = createServerFn({ method: "POST" })
  .middleware(requireAdminContext)
  .validator(createPlanSchema)
  .handler(async ({ data }) => AdminService.createPlan(data));

export const updateAdminPlan = createServerFn({ method: "POST" })
  .middleware(requireAdminContext)
  .validator(updatePlanSchema)
  .handler(async ({ data }) => AdminService.updatePlan(data));

export const setAdminDefaultPlan = createServerFn({ method: "POST" })
  .middleware(requireAdminContext)
  .validator(planIdActionSchema)
  .handler(async ({ data }) => AdminService.setDefaultPlan(data.planId));

export const setAdminPlanArchived = createServerFn({ method: "POST" })
  .middleware(requireAdminContext)
  .validator(setPlanArchivedSchema)
  .handler(async ({ data }) => AdminService.setPlanArchived(data));

export const assignAdminPlan = createServerFn({ method: "POST" })
  .middleware(requireAdminContext)
  .validator(assignPlanSchema)
  .handler(async ({ data, context }) =>
    AdminService.assignPlan(data, context.userId),
  );

export const adjustAdminCredits = createServerFn({ method: "POST" })
  .middleware(requireAdminContext)
  .validator(adjustCreditsSchema)
  .handler(async ({ data, context }) =>
    AdminService.adjustCredits(data, context.userId),
  );

export const setAdminWorkspaceStatus = createServerFn({ method: "POST" })
  .middleware(requireAdminContext)
  .validator(setWorkspaceStatusSchema)
  .handler(async ({ data, context }) =>
    AdminService.setWorkspaceStatus(data, context.userId),
  );

export const setAdminUserRole = createServerFn({ method: "POST" })
  .middleware(requireAdminContext)
  .validator(setUserAdminSchema)
  .handler(async ({ data }) => AdminService.setUserAdmin(data));
