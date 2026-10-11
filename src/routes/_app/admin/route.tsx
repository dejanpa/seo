import { Outlet, createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
import { NavTab, NavTabs } from "@/client/components/NavTabs";
import { PageHeader } from "@/client/components/PageHeader";
import { Spinner } from "@/client/components/Spinner";
import { useViewerAdminStatus } from "@/client/features/admin/queries";

export const Route = createFileRoute("/_app/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const viewer = useViewerAdminStatus();

  if (viewer.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  // The server refuses every admin endpoint on its own; this only keeps a
  // non-admin from staring at an empty console full of failed requests.
  if (!viewer.data?.isAdmin) {
    return (
      <div className="px-4 py-12 md:px-6">
        <div className="mx-auto max-w-md">
          <EmptyState
            icon={ShieldAlert}
            title="Administrator access required"
            description="Ask an existing administrator to grant you access, or add your email to the ADMIN_EMAILS environment variable."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-4">
          <PageHeader
            title="Admin"
            description="Every workspace on this deployment, the plan it is on, and what that plan lets it do."
          />
          <NavTabs label="Admin sections">
            <NavTab to="/admin" activeOptions={{ exact: true }}>
              Workspaces
            </NavTab>
            <NavTab to="/admin/plans">Plans</NavTab>
          </NavTabs>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
