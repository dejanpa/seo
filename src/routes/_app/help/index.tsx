import { createFileRoute, Link } from "@tanstack/react-router";
import { useViewerAdminStatus } from "@/client/features/admin/queries";
import { SerbianUserGuide } from "@/client/features/help/SerbianUserGuide";
import { PRODUCT_NAME } from "@/shared/brand";

export const Route = createFileRoute("/_app/help/")({
  component: GuideRoute,
});

/**
 * The Serbian original of the guide. Its English translation is the one users
 * read, in Help & Support; this copy is kept for the operator, so it is shown
 * to administrators only. Nothing here is privileged, so a client-side check is
 * the whole gate — it decides what to render, not what to protect.
 */
function GuideRoute() {
  const viewer = useViewerAdminStatus();

  if (viewer.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  if (!viewer.data?.isAdmin) {
    return (
      <div className="px-4 py-12 md:px-6">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-base-300 p-8 text-center">
          <h1 className="text-lg font-semibold">Guide moved</h1>
          <p className="text-sm text-base-content/60">
            The {PRODUCT_NAME} guide now lives in Help &amp; Support.
          </p>
          <Link to="/support" className="btn btn-sm">
            Open Help &amp; Support
          </Link>
        </div>
      </div>
    );
  }

  return <SerbianUserGuide />;
}
