import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";

/**
 * Plans, credits and entitlements are only stored in this database under
 * BILLING_PROVIDER=local. Under Autumn the console is read-only, so say why
 * rather than letting every save fail with a bare error.
 */
export function LocalBillingNotice() {
  return (
    <Alert variant="info">
      <Info />
      <AlertDescription>
        This deployment delegates billing to Autumn, so plans and credits are
        read-only here. Set{" "}
        <code className="text-xs">BILLING_PROVIDER=local</code> to administer
        plans from this console.
      </AlertDescription>
    </Alert>
  );
}
