import { Sparkles } from "lucide-react";

export function EnvBanner() {
  return (
    <div className="flex items-center gap-2 border-b bg-gradient-to-r from-accent/50 to-transparent px-6 py-1.5 text-xs">
      <Sparkles className="size-3.5 text-primary" />
      <span className="font-medium text-foreground">Demo workspace</span>
      <span className="text-muted-foreground">
        Money moves only through the append-only ledger — no live Razorpay or AI
        calls unless you connect keys.
      </span>
    </div>
  );
}
