"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART } from "@/lib/chartColors";
import { formatINR, formatINRShort } from "@/lib/format";
import type { TrendPoint } from "@/lib/services/metrics";

export function RecoveryTrendChart({ data }: { data: TrendPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
        No ledger activity yet.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="gRecovered" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.recovered} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART.recovered} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.net} stopOpacity={0.3} />
            <stop offset="100%" stopColor={CHART.net} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: CHART.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(d: string) => d.slice(5)}
        />
        <YAxis
          tick={{ fill: CHART.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(v: number) => formatINRShort(v)}
        />
        <Tooltip
          formatter={(v, name) => [
            formatINR(Number(v)),
            String(name) === "recovered" ? "Gross recovered" : "Net recovered",
          ]}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--popover-foreground)",
          }}
          labelStyle={{ color: "var(--muted-foreground)" }}
        />
        <Area
          type="monotone"
          dataKey="recovered"
          stroke={CHART.recovered}
          strokeWidth={2}
          fill="url(#gRecovered)"
        />
        <Area
          type="monotone"
          dataKey="net"
          stroke={CHART.net}
          strokeWidth={2}
          fill="url(#gNet)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
