import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useViewerAdminStatus } from "@/client/features/admin/queries";

export const Route = createFileRoute("/_app/admin")({
  component: AdminLayout,
});

const tabClass = (active: boolean) =>
  `tab ${active ? "tab-active" : ""}` as const;

function AdminLayout() {
  const viewer = useViewerAdminStatus();

  if (viewer.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  // The server refuses every admin endpoint on its own; this only keeps a
  // non-admin from staring at an empty console full of failed requests.
  if (!viewer.data?.isAdmin) {
    return (
      <div className="px-4 py-12 md:px-6">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-base-300 p-8 text-center">
          <ShieldAlert className="size-6 text-warning" />
          <h1 className="text-lg font-semibold">
            Administrator access required
          </h1>
          <p className="text-sm text-base-content/60">
            Ask an existing administrator to grant you access, or add your email
            to the ADMIN_EMAILS environment variable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-base-100 px-4 py-8 pb-24 md:px-6 md:py-10 md:pb-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-base-content/60">
            Every workspace on this deployment, the plan it is on, and what that
            plan lets it do.
          </p>
        </div>

        <div role="tablist" className="tabs tabs-bordered w-fit">
          <Link to="/admin" activeOptions={{ exact: true }} role="tab">
            {({ isActive }) => (
              <span className={tabClass(isActive)}>Workspaces</span>
            )}
          </Link>
          <Link to="/admin/plans" role="tab">
            {({ isActive }) => (
              <span className={tabClass(isActive)}>Plans</span>
            )}
          </Link>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
