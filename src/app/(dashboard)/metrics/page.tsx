"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { RecoveryTrendChart } from "@/components/charts/RecoveryTrendChart";
import { LaneDonut } from "@/components/charts/LaneDonut";
import { useMetrics } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { CHART } from "@/lib/chartColors";
import { formatINR, formatINRShort, formatPct } from "@/lib/format";
import { LANE_LABELS, type LaneName } from "@/lib/types";

export default function MetricsPage() {
  const { data, isLoading } = useMetrics();
  const m = data?.metrics;

  const moneyData = m
    ? [
        { name: "At-risk", value: m.atRiskValue, fill: CHART.risk },
        { name: "Gross", value: m.grossRecovered, fill: CHART.recovered },
        { name: "Incremental", value: m.incrementalRecovered, fill: CHART.incremental },
        { name: "Net", value: m.netRecovered, fill: CHART.net },
      ]
    : [];

  const laneData = (data?.lanes ?? []).map((l) => ({
    lane: LANE_LABELS[l.lane as LaneName] ?? l.lane,
    atRisk: l.atRiskValue,
    recovered: l.recoveredValue,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metrics"
        description="The scoreboard and the receipts — all ten measures, with a one-click audit export."
        actions={
          <div className="flex gap-2">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API download, not a page nav */}
            <a href="/api/export/json" download className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
              <Download className="size-4" /> JSON
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API download, not a page nav */}
            <a href="/api/export/csv" download className={cn(buttonVariants({ variant: "default", size: "sm" }), "gap-1.5")}>
              <Download className="size-4" /> Export audit (CSV)
            </a>
          </div>
        }
      />

      <div className="flex items-center gap-2 rounded-lg border border-money-risk/30 bg-money-risk/10 px-3 py-2 text-xs text-money-risk">
        <FlaskConical className="size-3.5" />
        Figures derive from the mock dataset. Experiment metrics (incremental) are labelled SIMULATED.
      </div>

      {isLoading || !m ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Money at a glance" subtitle="At-risk vs recovered (₹)">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={moneyData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => formatINRShort(v)} />
                  <Tooltip formatter={(v) => formatINR(Number(v))} contentStyle={tooltipStyle} cursor={{ fill: "#8884" }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {moneyData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="By lane" subtitle="At-risk vs recovered per lane (₹)">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={laneData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="lane" tick={{ fill: CHART.axis, fontSize: 10 }} tickLine={false} axisLine={false} interval={0} />
                  <YAxis tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => formatINRShort(v)} />
                  <Tooltip formatter={(v) => formatINR(Number(v))} contentStyle={tooltipStyle} cursor={{ fill: "#8884" }} />
                  <Bar dataKey="atRisk" name="At-risk" fill={CHART.risk} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recovered" name="Recovered" fill={CHART.recovered} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Recovered by lane" subtitle="Share of verified recovery">
              <LaneDonut data={data?.lanes ?? []} metric="recoveredValue" />
            </ChartCard>
            <ChartCard title="Recovery over time" subtitle="Cumulative gross vs net">
              <RecoveryTrendChart data={data?.trend ?? []} />
            </ChartCard>
          </div>

          {/* Rate bars */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <RateBar label="Eligible rate" value={m.eligibleRate} good />
            <RateBar label="Recovery rate" value={m.recoveryRate} good />
            <RateBar label="Automation rate" value={m.automationVsEscalation.automationRate} good />
            <RateBar label="Audit completeness" value={m.auditCompleteness} good />
            <RateBar label="False-action rate" value={m.falseActionRate} good={false} />
            <RateBar label="Customer-harm rate" value={m.customerHarmRate} good={false} />
          </div>

          {/* Full table */}
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">Metric</th>
                  <th className="px-4 py-2.5 text-right font-medium">Value</th>
                  <th className="px-4 py-2.5 text-left font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                <MetricRow name="At-risk value" value={formatINR(m.atRiskValue)} note="Open cases not yet recovered" />
                <MetricRow name="Eligible rate" value={formatPct(m.eligibleRate, 1)} note="Cases with an actionable proposal" />
                <MetricRow name="Recovery rate" value={formatPct(m.recoveryRate, 1)} note="Recovered ÷ eligible" />
                <MetricRow name="Gross recovered" value={formatINR(m.grossRecovered)} note="Verified captures (ledger)" />
                <MetricRow name="Incremental recovered" value={formatINR(m.incrementalRecovered)} note="Treatment − matched holdout" simulated />
                <MetricRow name="Net recovered" value={formatINR(m.netRecovered)} note="Gross − refunds" />
                <MetricRow name="False-action rate" value={formatPct(m.falseActionRate, 1)} note="Acted on already-settled cases" />
                <MetricRow name="Customer-harm rate" value={formatPct(m.customerHarmRate, 1)} note="Harmful messages that reached a customer" />
                <MetricRow name="Automation vs escalation" value={`${m.automationVsEscalation.automated} / ${m.automationVsEscalation.escalated}`} note="Automated vs escalated actions" />
                <MetricRow name="Audit completeness" value={formatPct(m.auditCompleteness, 1)} note="Cases with a complete trail" />
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
} as const;

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function RateBar({ label, value, good }: { label: string; value: number; good: boolean }) {
  const pct = Math.round(value * 100);
  const color = good ? "bg-money-recovered" : value > 0 ? "bg-destructive" : "bg-money-recovered";
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {good ? "higher is better" : "lower is better"}
      </p>
    </div>
  );
}

function MetricRow({
  name,
  value,
  note,
  simulated,
}: {
  name: string;
  value: string;
  note: string;
  simulated?: boolean;
}) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-2.5 font-medium">
        {name}
        {simulated && (
          <span className="ml-2 rounded bg-money-risk/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-money-risk">
            simulated
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums">{value}</td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground">{note}</td>
    </tr>
  );
}
