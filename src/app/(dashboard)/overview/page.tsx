"use client";

import Link from "next/link";
import {
  CreditCard,
  ShoppingCart,
  RefreshCw,
  FileText,
  ArrowRight,
  ShieldCheck,
  Ban,
} from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { KpiCard } from "@/components/kpi/KpiCard";
import { MoneyText } from "@/components/ui-ext/MoneyText";
import { RecoveryTrendChart } from "@/components/charts/RecoveryTrendChart";
import { LaneDonut } from "@/components/charts/LaneDonut";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetrics, useApprovals } from "@/lib/hooks";
import { formatINRShort, formatINR, formatAge, titleCase } from "@/lib/format";
import { LANE_LABELS, type LaneName } from "@/lib/types";

const LANE_TILES: { lane: LaneName; label: string; icon: typeof CreditCard }[] = [
  { lane: "payment_failure", label: "Payments", icon: CreditCard },
  { lane: "abandoned_checkout", label: "Checkout", icon: ShoppingCart },
  { lane: "failed_subscription", label: "Subscriptions", icon: RefreshCw },
  { lane: "overdue_receivable", label: "Receivables", icon: FileText },
];

export default function OverviewPage() {
  const metrics = useMetrics();
  const approvals = useApprovals();

  const m = metrics.data?.metrics;
  const lanes = metrics.data?.lanes ?? [];
  const activity = metrics.data?.activity ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="At-risk value, verified recovery, and live agent activity for your merchant."
      />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.isLoading || !m ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))
        ) : (
          <>
            <KpiCard
              label="At-risk value"
              value={formatINRShort(m.atRiskValue)}
              variant="risk"
              caption={`${m.counts.total - m.counts.recovered} open cases`}
            />
            <KpiCard
              label="Recovered (gross)"
              value={formatINRShort(m.grossRecovered)}
              variant="recovered"
              caption={`${m.counts.recovered} verified recoveries`}
            />
            <KpiCard
              label="Incremental recovered"
              value={formatINRShort(m.incrementalRecovered)}
              variant="net"
              caption="vs matched holdout baseline"
            />
            <KpiCard
              label="Net recovered"
              value={formatINRShort(m.netRecovered)}
              variant="net"
              caption={`${formatINR(m.totals.refunds)} refunded back out`}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: trend + lane tiles */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recovery over time</h2>
              <span className="text-xs text-muted-foreground">
                Cumulative · gross vs net
              </span>
            </div>
            {metrics.isLoading ? (
              <Skeleton className="h-60 w-full" />
            ) : (
              <RecoveryTrendChart data={metrics.data?.trend ?? []} />
            )}
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">At-risk value by lane</h2>
              <span className="text-xs text-muted-foreground">where the risk sits</span>
            </div>
            {metrics.isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <LaneDonut data={lanes} metric="atRiskValue" />
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {LANE_TILES.map((tile) => {
              const l = lanes.find((x) => x.lane === tile.lane);
              const Icon = tile.icon;
              return (
                <Link
                  key={tile.lane}
                  href={`/cases?lane=${tile.lane}`}
                  className="group rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="flex items-center justify-between">
                    <Icon className="size-4.5 text-muted-foreground" />
                    <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="mt-3 text-sm font-medium">{tile.label}</p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {l?.count ?? 0}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <MoneyText value={l?.atRiskValue ?? 0} variant="risk" short /> in play
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: approvals + activity */}
        <div className="space-y-6">
          <section className="rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="text-sm font-semibold">Awaiting approval</h2>
              <Link href="/approvals" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y">
              {approvals.isLoading ? (
                <div className="p-5">
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : approvals.data?.items.length ? (
                approvals.data.items.slice(0, 5).map((it) => (
                  <Link
                    key={it.case.id}
                    href={`/cases/${it.case.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {it.case.customerName || it.case.entityId}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {LANE_LABELS[it.case.lane as LaneName] ?? it.case.lane} ·{" "}
                        {titleCase(it.decision.proposedAction)}
                      </p>
                    </div>
                    <MoneyText value={it.case.amount} variant="risk" short />
                  </Link>
                ))
              ) : (
                <p className="px-5 py-6 text-sm text-muted-foreground">
                  Nothing awaiting approval.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border bg-card shadow-sm">
            <div className="border-b px-5 py-3">
              <h2 className="text-sm font-semibold">Agent activity</h2>
            </div>
            <div className="divide-y">
              {activity.length ? (
                activity.slice(0, 7).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-5 py-2.5">
                    {a.allowed ? (
                      <ShieldCheck className="size-4 shrink-0 text-money-recovered" />
                    ) : (
                      <Ban className="size-4 shrink-0 text-destructive" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {titleCase(a.agent)} → {a.tool}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.case.entityId}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatAge(a.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="px-5 py-6 text-sm text-muted-foreground">No recent activity.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
