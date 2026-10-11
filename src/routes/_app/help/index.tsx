import { createFileRoute, Link } from "@tanstack/react-router";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Spinner } from "@/client/components/Spinner";
import { Button } from "@/client/components/ui/button";
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
        <Spinner />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-3xl space-y-10">
        {viewer.data?.isAdmin ? (
          <>
            <PageHeader
              title={`Priručnik za ${PRODUCT_NAME}`}
              description="Šta koja stranica radi, kojim redom ih koristiti i gde se troše krediti."
            />
            <SerbianUserGuide />
          </>
        ) : (
          <EmptyState
            icon={null}
            title="Guide moved"
            description={`The ${PRODUCT_NAME} guide now lives in Help & Support.`}
            action={
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link to="/support" />}
              >
                Open Help & Support
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
