import { createFileRoute } from "@tanstack/react-router";
import { CopyButton } from "@/client/components/CopyButton";
import { PageHeader } from "@/client/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { UserGuide } from "@/client/features/help/UserGuide";
import { SUPPORT_EMAIL } from "@/client/lib/support";
import { PRODUCT_NAME } from "@/shared/brand";

export const Route = createFileRoute("/_app/support")({
  component: SupportPage,
});

function SupportPage() {
  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-3xl space-y-10">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Help & Support
          </p>
          <PageHeader
            title={`How to use ${PRODUCT_NAME}`}
            description="What each page does, the order to use them in, and where credits are spent."
          />
        </div>

        <UserGuide />

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Still stuck?</h2>
            </CardTitle>
            <CardDescription>
              Send ideas, problems, questions, or feedback directly — we want to
              learn how you work so we can make {PRODUCT_NAME} better.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CopyButton
              value={SUPPORT_EMAIL}
              label={SUPPORT_EMAIL}
              successMessage="Email copied to clipboard"
              size="sm"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
