"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui-ext/StatusPill";
import { MoneyText } from "@/components/ui-ext/MoneyText";
import { useApprovals, useCaseAction, usePolicies, useSavePolicy } from "@/lib/hooks";
import { titleCase } from "@/lib/format";
import { LANE_LABELS, parseCsv, type LaneName } from "@/lib/types";

const AUTO_CLASSES = [
  "low_value_retry",
  "insufficient_funds",
  "expired_card",
  "network_error",
];

export default function ApprovalsPage() {
  const approvals = useApprovals();
  const action = useCaseAction();
  const policies = usePolicies();
  const savePolicy = useSavePolicy();
  const [selected, setSelected] = useState<string[] | null>(null);

  const active = policies.data?.active;
  const current = selected ?? (active ? parseCsv(active.autoApproveClasses) : []);

  const run = async (caseId: string, kind: string) => {
    const res = await action.mutateAsync({ caseId, action: kind });
    if (res.recovered) toast.success(res.note);
    else toast.message(res.note);
  };

  const toggleClass = (cls: string) => {
    const base = selected ?? (active ? parseCsv(active.autoApproveClasses) : []);
    setSelected(
      base.includes(cls) ? base.filter((c) => c !== cls) : [...base, cls],
    );
  };

  const saveConfig = async () => {
    if (!active) return;
    await savePolicy.mutateAsync({
      retryBudget: active.retryBudget,
      amountThreshold: active.amountThreshold,
      dueAgeDays: active.dueAgeDays,
      allowedChannels: active.allowedChannels,
      maxDiscountPct: active.maxDiscountPct,
      consentRequired: active.consentRequired,
      autoApproveClasses: current.join(","),
    });
    setSelected(null);
    toast.success("Saved as a new policy version");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Actions prepared by the agents, waiting for a human yes/no."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Work queue */}
        <div className="space-y-3 lg:col-span-2">
          {approvals.isLoading ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : approvals.data?.items.length ? (
            approvals.data.items.map((it) => (
              <div key={it.case.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/cases/${it.case.id}`}
                        className="font-mono text-sm font-medium hover:underline"
                      >
                        {it.case.entityId}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {LANE_LABELS[it.case.lane as LaneName] ?? it.case.lane}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {titleCase(it.decision.proposedAction)} · {it.decision.reasonCode} ·{" "}
                      {Math.round(it.decision.confidence * 100)}% confidence
                    </p>
                  </div>
                  <MoneyText value={it.case.amount} variant="risk" />
                </div>

                {it.draftedMessage && (
                  <div className="mt-3 rounded-lg border bg-muted/40 p-3">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Drafted {it.draftedMessage.channel} — dark-pattern screen passed
                    </p>
                    <p className="whitespace-pre-line text-xs text-muted-foreground">
                      {it.draftedMessage.body}
                    </p>
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => run(it.case.id, "approve")} disabled={action.isPending}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => run(it.case.id, "escalate")} disabled={action.isPending}>
                    Escalate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => run(it.case.id, "hold")} disabled={action.isPending}>
                    Hold
                  </Button>
                  <Button size="sm" variant="destructive" className="ml-auto" onClick={() => run(it.case.id, "reject")} disabled={action.isPending}>
                    Reject
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="Queue is clear" hint="No actions are waiting for approval." />
          )}
        </div>

        {/* Auto-approve config */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Auto-approve classes</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Failure classes the agents may act on without a human. Saving creates a new
              policy version.
            </p>
            <div className="mt-4 space-y-2.5">
              {AUTO_CLASSES.map((cls) => (
                <label key={cls} className="flex items-center gap-2.5 text-sm">
                  <Checkbox
                    checked={current.includes(cls)}
                    onCheckedChange={() => toggleClass(cls)}
                  />
                  {titleCase(cls)}
                </label>
              ))}
            </div>
            <Button
              size="sm"
              className="mt-4 w-full"
              onClick={saveConfig}
              disabled={savePolicy.isPending || !active || selected === null}
            >
              {selected === null ? "No changes" : "Save new policy version"}
            </Button>
            {active && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Active policy v{active.version}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
