"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Zap,
  Wrench,
  Ban,
  Mail,
  User,
  IndianRupee,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui-ext/StatusPill";
import { MoneyText } from "@/components/ui-ext/MoneyText";
import { useCaseDetail, useCaseAction } from "@/lib/hooks";
import { formatDateTime, formatINR, titleCase } from "@/lib/format";
import { LANE_LABELS, type LaneName } from "@/lib/types";
import type { TimelineItem } from "@/lib/api-types";

const KIND_ICON = {
  event: Zap,
  tool_call: Wrench,
  message: Mail,
  decision: User,
  ledger: IndianRupee,
} as const;

export function CaseDetailView({ id }: { id: string }) {
  const { data, isLoading, isError } = useCaseDetail(id);
  const action = useCaseAction();
  const [note, setNote] = useState("");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="space-y-4">
        <PageHeader title="Case not found" />
        <Link href="/cases" className="text-sm text-primary hover:underline">
          ← Back to cases
        </Link>
      </div>
    );
  }

  const c = data.case;
  const { reconcile, decision, timeline } = data;
  const isNoop = reconcile.noop || c.reasonCode === "already_paid";

  const run = async (kind: string) => {
    const res = await action.mutateAsync({ caseId: c.id, action: kind, note: note || undefined });
    if (res.recovered) toast.success(res.note);
    else toast.message(res.note);
    setNote("");
  };

  return (
    <div className="space-y-6">
      <Link
        href="/cases"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Cases
      </Link>

      <PageHeader
        title={c.entityId}
        description={`${LANE_LABELS[c.lane as LaneName] ?? c.lane} · decision log`}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill status={c.currentState} />
            <StatusPill status={c.approvalState} />
            <MoneyText value={c.amount} className="text-lg" />
          </div>
        }
      />

      {isNoop && (
        <div className="flex items-start gap-3 rounded-xl border border-accent-blue/30 bg-accent-blue/10 p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent-blue" />
          <div>
            <p className="text-sm font-semibold text-accent-blue">Intelligent no-op — {reconcile.reasonCode}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{reconcile.note}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Story */}
        <div className="space-y-6 lg:col-span-2">
          {/* Reconcile */}
          <Section title="Reconciliation" subtitle="Live state is re-read before any action">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Fact label="Webhook said"><StatusPill status={reconcile.webhookStatus} /></Fact>
              <Fact label="Live state (verified)"><StatusPill status={reconcile.liveStatus} /></Fact>
              <Fact label="Decision">{reconcile.noop ? "No action" : "Proceed"}</Fact>
              <Fact label="Reason">{reconcile.reasonCode}</Fact>
            </div>
          </Section>

          {/* Classification + decision */}
          <Section title="Classification & decision" subtitle="Rule-based scoring under the active policy">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <Fact label="Failure class">{titleCase(c.failureClass ?? "—")}</Fact>
              <Fact label="Reason code">{decision.reasonCode}</Fact>
              <Fact label="Confidence">{Math.round(decision.confidence * 100)}%</Fact>
              <Fact label="Policy version">v{decision.policyVersion ?? "—"}</Fact>
              <Fact label="Proposed action">{titleCase(decision.proposedAction)}</Fact>
              <Fact label="Expected net">
                <MoneyText value={decision.expectedNetRecovery} variant="net" />
              </Fact>
              <Fact label="Probability">{Math.round(decision.components.probability * 100)}%</Fact>
              <Fact label="Urgency">{decision.components.urgency.toFixed(2)}×</Fact>
            </div>
          </Section>

          {/* Timeline */}
          <Section title="Decision log" subtitle="Original event → reconcile → classify → action → outcome">
            <ol className="space-y-0">
              {timeline.map((item: TimelineItem, i) => {
                const Icon =
                  item.kind === "tool_call" && item.detail.includes("BLOCKED")
                    ? Ban
                    : (KIND_ICON[item.kind] ?? Zap);
                const blocked =
                  item.detail.includes("BLOCKED") || item.detail.includes("REJECTED");
                return (
                  <li key={i} className="flex gap-3 pb-4 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${
                          blocked
                            ? "border-destructive/30 bg-destructive/10 text-destructive"
                            : "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="size-3.5" />
                      </div>
                      {i < timeline.length - 1 && <div className="w-px flex-1 bg-border" />}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium">{item.title}</p>
                        <time className="shrink-0 text-xs text-muted-foreground">
                          {formatDateTime(item.ts)}
                        </time>
                      </div>
                      {item.detail && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Section>
        </div>

        {/* Action panel + facts */}
        <div className="space-y-6">
          <Section title="Operator action">
            {c.recoveryAttribution > 0 && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-money-recovered/10 p-2.5 text-sm text-money-recovered">
                <CheckCircle2 className="size-4" />
                Recovered {formatINR(c.recoveryAttribution)}
              </div>
            )}
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)…"
              rows={3}
              className="mb-3"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => run("approve")} disabled={action.isPending}>
                Approve
              </Button>
              <Button variant="outline" onClick={() => run("escalate")} disabled={action.isPending}>
                Escalate
              </Button>
              <Button variant="outline" onClick={() => run("hold")} disabled={action.isPending}>
                Hold
              </Button>
              <Button variant="destructive" onClick={() => run("reject")} disabled={action.isPending}>
                Reject
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Approving executes the action, then records a recovery only after re-reading a
              verified capture.
            </p>
          </Section>

          <Section title="Case facts">
            <dl className="space-y-2.5 text-sm">
              <Fact label="Entity">{c.entityType} · {c.entityId}</Fact>
              <Fact label="Amount"><MoneyText value={c.amount} /></Fact>
              <Fact label="Consent">{titleCase(c.consentState)}</Fact>
              <Fact label="Attempts">{c.attemptCount}</Fact>
              <Fact label="Holdout group">{c.holdout?.group ?? "—"}</Fact>
              <Fact label="Reversal">{titleCase(c.reversalStatus)}</Fact>
            </dl>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
