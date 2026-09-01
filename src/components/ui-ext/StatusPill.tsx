import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/format";

type Tone = "green" | "amber" | "blue" | "red" | "purple" | "gray";

const TONE_CLASS: Record<Tone, string> = {
  green: "bg-money-recovered/12 text-money-recovered ring-money-recovered/30",
  amber: "bg-money-risk/15 text-money-risk ring-money-risk/30",
  blue: "bg-accent-blue/12 text-accent-blue ring-accent-blue/30",
  red: "bg-destructive/12 text-destructive ring-destructive/30",
  purple: "bg-chart-4/15 text-chart-4 ring-chart-4/30",
  gray: "bg-muted text-muted-foreground ring-border",
};

const TONE_FOR: Record<string, Tone> = {
  // settled / recovered
  recovered: "green",
  paid: "green",
  captured: "green",
  active: "green",
  charged: "green",
  won: "green",
  approved: "green",
  auto_approved: "green",
  sent: "green",
  // in-progress / attention
  pending: "amber",
  drafted: "amber",
  created: "amber",
  overdue: "amber",
  hold: "amber",
  disputed: "amber",
  open: "amber",
  // intelligent no-op / info
  noop: "blue",
  already_paid: "blue",
  already_settled: "blue",
  none: "gray",
  // escalation
  escalated: "purple",
  // stops / negatives
  halted: "gray",
  refunded: "red",
  rejected: "red",
  blocked: "red",
  failed: "red",
  denied: "red",
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const key = (status ?? "").toLowerCase();
  const tone = TONE_FOR[key] ?? "gray";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {label ?? titleCase(status)}
    </span>
  );
}
