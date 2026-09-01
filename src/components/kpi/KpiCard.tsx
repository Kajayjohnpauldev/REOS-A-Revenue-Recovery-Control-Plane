import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "recovered" | "risk" | "net" | "neutral";

const VALUE_CLASS: Record<Variant, string> = {
  recovered: "text-money-recovered",
  risk: "text-money-risk",
  net: "text-money-net",
  neutral: "text-foreground",
};

const ACCENT_BAR: Record<Variant, string> = {
  recovered: "bg-money-recovered",
  risk: "bg-money-risk",
  net: "bg-money-net",
  neutral: "bg-border",
};

export function KpiCard({
  label,
  value,
  variant = "neutral",
  caption,
  icon,
}: {
  label: string;
  value: ReactNode;
  variant?: Variant;
  caption?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm">
      <div className={cn("absolute inset-x-0 top-0 h-0.5", ACCENT_BAR[variant])} />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <p
        className={cn(
          "mt-3 text-3xl font-semibold tabular-nums tracking-tight",
          VALUE_CLASS[variant],
        )}
      >
        {value}
      </p>
      {caption ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  );
}
