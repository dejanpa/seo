import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserGuide } from "@/client/features/help/UserGuide";
import { PRODUCT_NAME, SUPPORT_EMAIL } from "@/shared/brand";

export const Route = createFileRoute("/_app/support")({
  component: SupportPage,
});

function SupportPage() {
  return (
    <div className="h-full overflow-auto bg-base-100 px-4 py-8 pb-24 md:px-6 md:py-10 md:pb-8">
      <div className="mx-auto w-full max-w-3xl space-y-10">
        <header className="space-y-2 border-b border-base-300 pb-6">
          <p className="text-xs font-medium uppercase tracking-widest text-base-content/40">
            Help &amp; Support
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            How to use {PRODUCT_NAME}
          </h1>
          <p className="text-sm leading-relaxed text-base-content/70">
            What each page does, the order to use them in, and where credits are
            spent.
          </p>
        </header>

        <UserGuide />

        <ContactSection />
      </div>
    </div>
  );
}

function ContactSection() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(SUPPORT_EMAIL);
    toast.success("Email copied to clipboard");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="space-y-3 border-t border-base-300 pt-8">
      <h2 className="text-xl font-semibold">Still stuck?</h2>
      <p className="text-sm leading-relaxed text-base-content/80">
        We want to talk to you. Send ideas, problems, questions, or feedback
        directly — we are keen to learn how you work so we can make{" "}
        {PRODUCT_NAME} better.
      </p>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-200/50 px-3 py-1.5 text-sm font-medium text-base-content transition-colors hover:bg-base-200"
      >
        <span className="font-mono text-xs">{SUPPORT_EMAIL}</span>
        {copied ? (
          <Check className="size-3.5 text-success" />
        ) : (
          <Copy className="size-3.5 text-base-content/40" />
        )}
      </button>
    </section>
  );
}
