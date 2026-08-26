import { useQuery } from "@tanstack/react-query";
import {
  getAdminOverview,
  getAdminPlans,
  getAdminWorkspaceDetail,
  getAdminWorkspaces,
  getViewerAdminStatus,
} from "@/serverFunctions/admin";

export const adminKeys = {
  viewer: ["admin", "viewer"] as const,
  overview: ["admin", "overview"] as const,
  plans: ["admin", "plans"] as const,
  workspaces: (search: string, page: number) =>
    ["admin", "workspaces", search, page] as const,
  workspace: (organizationId: string) =>
    ["admin", "workspace", organizationId] as const,
};

export function useViewerAdminStatus() {
  return useQuery({
    queryKey: adminKeys.viewer,
    queryFn: () => getViewerAdminStatus(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminOverview() {
  return useQuery({
    queryKey: adminKeys.overview,
    queryFn: () => getAdminOverview(),
  });
}

export function useAdminPlans() {
  return useQuery({
    queryKey: adminKeys.plans,
    queryFn: () => getAdminPlans(),
  });
}

export function useAdminWorkspaces(search: string, page: number) {
  return useQuery({
    queryKey: adminKeys.workspaces(search, page),
    queryFn: () =>
      getAdminWorkspaces({ data: { search: search || undefined, page } }),
  });
}

export function useAdminWorkspace(organizationId: string) {
  return useQuery({
    queryKey: adminKeys.workspace(organizationId),
    queryFn: () => getAdminWorkspaceDetail({ data: { organizationId } }),
  });
}
