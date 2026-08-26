import { Info } from "lucide-react";

/**
 * Plans, credits and entitlements are only stored in this database under
 * BILLING_PROVIDER=local. Under Autumn the console is read-only, so say why
 * rather than letting every save fail with a bare error.
 */
export function LocalBillingNotice() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/10 p-3 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-info" />
      <p>
        This deployment delegates billing to Autumn, so plans and credits are
        read-only here. Set{" "}
        <code className="text-xs">BILLING_PROVIDER=local</code> to administer
        plans from this console.
      </p>
    </div>
  );
}
