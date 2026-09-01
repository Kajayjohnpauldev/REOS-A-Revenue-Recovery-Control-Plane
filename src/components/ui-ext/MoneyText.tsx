import { cn } from "@/lib/utils";
import { formatINR, formatINRShort } from "@/lib/format";

type Variant = "recovered" | "risk" | "net" | "neutral";

const VARIANT_CLASS: Record<Variant, string> = {
  recovered: "text-money-recovered",
  risk: "text-money-risk",
  net: "text-money-net",
  neutral: "text-foreground",
};

export function MoneyText({
  value,
  variant = "neutral",
  short = false,
  className,
}: {
  value: number;
  variant?: Variant;
  short?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tabular-nums font-semibold tracking-tight",
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {short ? formatINRShort(value) : formatINR(value)}
    </span>
  );
}
