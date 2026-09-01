"use client";

import { useState } from "react";
import { Play, Loader2, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui-ext/StatusPill";
import { MoneyText } from "@/components/ui-ext/MoneyText";
import { useReplay } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import type { ReplayResult } from "@/lib/api-types";

const PILL_STATUS: Record<string, string> = {
  no_op: "noop",
  blocked: "blocked",
  recovered: "recovered",
  stopped: "halted",
  escalated: "escalated",
  refunded: "refunded",
};

export default function ReplayPage() {
  const replay = useReplay();
  const [result, setResult] = useState<ReplayResult | null>(null);
  const [reveal, setReveal] = useState(0);
  const [holdoutPct, setHoldoutPct] = useState(30);
  const [view, setView] = useState<"gross" | "incremental">("gross");

  const run = async () => {
    setResult(null);
    setReveal(0);
    const r = await replay.mutateAsync({ holdoutPct });
    setResult(r);
    r.rows.forEach((_, i) => {
      setTimeout(() => setReveal(i + 1), (i + 1) * 500);
    });
  };

  const rows = result?.rows ?? [];
  const shown = rows.slice(0, reveal);
  const liveRecovered = shown.filter((r) => r.moneyEffect > 0).reduce((s, r) => s + r.moneyEffect, 0);
  const liveNet = shown.reduce((s, r) => s + r.moneyEffect, 0);
  const done = result && reveal >= rows.length;

  const headline = view === "incremental" ? result?.summary.incrementalRecovered ?? 0 : result?.summary.grossRecovered ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Replay & Experiment Studio"
        description="Run a batch through the same production pipeline and watch the six scripted moments, live."
      />

      {/* Config + hero */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Run configuration</h2>
          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Holdout percentage: {holdoutPct}%
            </label>
            <input
              type="range"
              min={0}
              max={50}
              value={holdoutPct}
              onChange={(e) => setHoldoutPct(Number(e.target.value))}
              className="w-full accent-[color:var(--primary)]"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Fixtures span all five lanes, including the stale, duplicate, and out-of-order events.
          </p>
          <Button className="mt-4 w-full gap-2" onClick={run} disabled={replay.isPending}>
            {replay.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            Run Replay
          </Button>
        </div>

        {/* Live hero */}
        <div className="rounded-xl border bg-gradient-to-br from-primary/10 to-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-lg border bg-background p-0.5 text-xs">
              <button
                onClick={() => setView("gross")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  view === "gross" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                Gross recovered
              </button>
              <button
                onClick={() => setView("incremental")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  view === "incremental" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                Incremental vs holdout
              </button>
            </div>
            <TrendingUp className="size-5 text-primary" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {view === "incremental" ? "Incremental" : "Recovered"}
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-money-net">
                {result ? formatINR(done ? headline : liveRecovered) : "—"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {view === "incremental" ? "treatment − matched holdout" : "verified captures"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Net</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-money-recovered">
                {result ? formatINR(done ? result.summary.netRecovered : liveNet) : "—"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                after {result ? formatINR(result.summary.refunds) : "₹0"} refunds
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Moments</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {reveal}/{rows.length || 6}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">processed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Run table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-5 py-3">
          <h2 className="text-sm font-semibold">Run log</h2>
        </div>
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Press <span className="font-medium text-foreground">Run Replay</span> to stream the six
            scripted moments through the live pipeline.
          </div>
        ) : (
          <ol className="divide-y">
            {shown.map((r) => {
              const pos = r.moneyEffect > 0;
              const neg = r.moneyEffect < 0;
              return (
                <li
                  key={r.moment}
                  className="flex animate-in fade-in slide-in-from-bottom-1 items-start gap-4 px-5 py-4 duration-300"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold tabular-nums">
                    {r.moment}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{r.label}</span>
                      <StatusPill status={PILL_STATUS[r.status] ?? r.status} label={r.status.replace("_", "-")} />
                      <span className="font-mono text-xs text-muted-foreground">{r.entityId}</span>
                      {r.moneyEffect !== 0 && (
                        <span className="ml-auto">
                          <MoneyText value={r.moneyEffect} variant={pos ? "recovered" : neg ? "risk" : "neutral"} />
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{r.explanation}</p>
                    <p className="mt-1 text-xs text-muted-foreground/80">{r.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
