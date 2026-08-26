import {
  adjustCredits,
  assignPlan,
  createPlan,
  getWorkspaceDetail,
  listPlans,
  listWorkspaces,
  setDefaultPlan,
  setPlanArchived,
  setUserAdmin,
  setWorkspaceStatus,
  updatePlan,
} from "@/server/features/admin/services/admin";

export const AdminService = {
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
} as const;
