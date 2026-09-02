"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "recovered" | "risk" | "net" | "neutral";

const VALUE_CLASS: Record<Variant, string> = {
  recovered: "text-money-recovered",
  risk: "text-money-risk",
  net: "text-money-net",
  neutral: "text-foreground",
};
const STROKE: Record<Variant, string> = {
  recovered: "var(--money-recovered)",
  risk: "var(--money-risk)",
  net: "var(--money-net)",
  neutral: "var(--foreground)",
};
const BAR: Record<Variant, string> = {
  recovered: "bg-money-recovered",
  risk: "bg-money-risk",
  net: "bg-money-net",
  neutral: "bg-foreground/60",
};

function MiniBars({
  data,
  stroke,
}: {
  data: { label?: string; value: number }[];
  stroke: string;
}) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <div className="flex h-9 items-end gap-1.5">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm"
          style={{
            height: `${Math.max(8, (Math.abs(d.value) / max) * 100)}%`,
            background: stroke,
            opacity: 0.55 + (i / Math.max(1, data.length - 1)) * 0.4,
          }}
          title={d.label}
        />
      ))}
    </div>
  );
}

function Sparkline({ data, stroke }: { data: number[]; stroke: string }) {
  if (data.length < 2) return null;
  const w = 120;
  const h = 34;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((d, i) => `${(i / (data.length - 1)) * w},${h - ((d - min) / range) * (h - 4) - 2}`)
    .join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none">
      <polygon points={area} fill={stroke} opacity={0.12} />
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function InteractiveKpi({
  label,
  value,
  variant = "neutral",
  caption,
  href,
  series,
  bars,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  variant?: Variant;
  caption?: ReactNode;
  href: string;
  series?: number[];
  bars?: { label?: string; value: number }[];
  hint?: string;
  icon?: ReactNode;
}) {
  const router = useRouter();
  const [hover, setHover] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDoubleClick={() => router.push(href)}
      onKeyDown={(e) => (e.key === "Enter" ? router.push(href) : undefined)}
      className="group relative min-h-36 cursor-pointer overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.35)]"
    >
      <div className={cn("absolute inset-x-0 top-0 h-0.5", BAR[variant])} />
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className="text-muted-foreground">
          {icon ?? (
            <ArrowUpRight className="size-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          )}
        </span>
      </div>
      <p className={cn("mt-3 text-[2rem] font-semibold leading-none reos-tnum tracking-tight", VALUE_CLASS[variant])}>
        {value}
      </p>
      {caption && <p className="mt-2 text-xs text-muted-foreground">{caption}</p>}

      <AnimatePresence>
        {hover && ((bars && bars.length > 0) || (series && series.length > 1)) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl border bg-background/75 p-2.5 shadow-lg backdrop-blur-md"
          >
            {bars && bars.length > 0 ? (
              <MiniBars data={bars} stroke={STROKE[variant]} />
            ) : (
              <Sparkline data={series ?? []} stroke={STROKE[variant]} />
            )}
            <p className="mt-1 flex items-center justify-between text-[10.5px] text-muted-foreground">
              <span>{hint ?? "trend"}</span>
              <span className="font-medium">double-click to open →</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
