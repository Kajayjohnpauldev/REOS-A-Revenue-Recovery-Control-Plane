"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { LANE_COLORS } from "@/lib/chartColors";
import { LANE_LABELS, type LaneName } from "@/lib/types";
import { formatINR, formatINRShort } from "@/lib/format";
import type { LaneSummary } from "@/lib/services/metrics";

export function LaneDonut({
  data,
  metric = "atRiskValue",
}: {
  data: LaneSummary[];
  metric?: "atRiskValue" | "recoveredValue";
}) {
  const chart = data
    .map((d) => ({
      name: LANE_LABELS[d.lane as LaneName] ?? d.lane,
      lane: d.lane,
      value: d[metric],
    }))
    .filter((d) => d.value > 0);

  const total = chart.reduce((s, d) => s + d.value, 0);

  if (!total) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
        Nothing to chart yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chart}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={2}
              strokeWidth={0}
            >
              {chart.map((d) => (
                <Cell key={d.lane} fill={LANE_COLORS[d.lane] ?? "#64748b"} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => formatINR(Number(v))}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--popover-foreground)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold tabular-nums">{formatINRShort(total)}</span>
          <span className="text-[11px] text-muted-foreground">total</span>
        </div>
      </div>
      <ul className="flex-1 space-y-2">
        {chart
          .sort((a, b) => b.value - a.value)
          .map((d) => (
            <li key={d.lane} className="flex items-center gap-2 text-sm">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: LANE_COLORS[d.lane] ?? "#64748b" }}
              />
              <span className="flex-1 truncate text-muted-foreground">{d.name}</span>
              <span className="font-medium tabular-nums">{formatINRShort(d.value)}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}
