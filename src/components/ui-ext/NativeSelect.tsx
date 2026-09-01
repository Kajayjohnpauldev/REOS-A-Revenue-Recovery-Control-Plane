"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

export function NativeSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full appearance-none rounded-lg border border-input bg-transparent pl-2.5 pr-8 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-popover text-popover-foreground">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
