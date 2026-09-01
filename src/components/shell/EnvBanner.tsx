import { ShieldCheck } from "lucide-react";

export function EnvBanner() {
  return (
    <div className="flex items-center gap-2 border-b bg-accent/40 px-6 py-1.5 text-xs text-accent-foreground">
      <ShieldCheck className="size-3.5" />
      <span className="font-medium">TEST environment · mock mode</span>
      <span className="text-muted-foreground">
        No real Razorpay charges or AI calls — money only moves through the
        append-only ledger.
      </span>
    </div>
  );
}
