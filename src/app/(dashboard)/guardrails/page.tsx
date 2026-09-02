"use client";

import { ShieldX, Ban, MailWarning, Bot, Cpu, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useGuardrails } from "@/lib/hooks";
import { formatDateTime, titleCase } from "@/lib/format";
import { LANE_LABELS, type LaneName } from "@/lib/types";

const RULE_LABEL: Record<string, string> = {
  tool_not_in_allowlist: "Tool not in the agent's allowlist",
  consent_required: "No customer consent on file",
  channel_not_allowed: "Channel not permitted by policy",
  retry_budget_exhausted: "Retry budget (T+3) exhausted",
  dark_pattern_false_urgency: "Dark pattern: false urgency",
  dark_pattern_screen: "Manipulative copy — dark-pattern screen",
};

export default function GuardrailsPage() {
  const { data, isLoading } = useGuardrails();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guardrails"
        description="What the agents refused to do — blocked tool calls, rejected messages, consent and budget stops."
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total refusals" value={data?.summary.total ?? 0} icon={<ShieldX className="size-4" />} />
        <StatCard label="Blocked tool calls" value={data?.summary.blockedTools ?? 0} icon={<Ban className="size-4" />} />
        <StatCard label="Rejected messages" value={data?.summary.rejectedMessages ?? 0} icon={<MailWarning className="size-4" />} />
      </div>

      {/* Showpiece */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <ShieldX className="size-5 text-destructive" />
          <h2 className="text-lg font-semibold tracking-tight">What the agent refused to do</h2>
        </div>
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : data?.refusals.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {data.refusals.map((r) => (
              <div
                key={r.id}
                className="overflow-hidden rounded-xl border border-destructive/30 bg-destructive/5 shadow-sm"
              >
                <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2.5">
                  {r.kind === "rejected_message" ? (
                    <MailWarning className="size-4 text-destructive" />
                  ) : (
                    <Ban className="size-4 text-destructive" />
                  )}
                  <span className="text-sm font-semibold text-destructive">
                    {r.kind === "rejected_message" ? "Message refused" : "Tool call blocked"}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDateTime(r.createdAt)}
                  </span>
                </div>
                <div className="space-y-2 p-4 text-sm">
                  <Row label="Agent">{titleCase(r.agent)}</Row>
                  <Row label="Attempted">{r.attempted}</Row>
                  <Row label="Blocked by">
                    <span className="font-medium text-destructive">
                      {RULE_LABEL[r.rule] ?? r.rule}
                    </span>
                  </Row>
                  <Row label="Case">
                    {r.customerName || r.entityId}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      ({r.entityId})
                    </span>{" "}
                    · {LANE_LABELS[r.lane as LaneName] ?? r.lane}
                  </Row>
                  {r.detail && (
                    <div className="mt-2 rounded-lg border border-destructive/20 bg-background/60 p-2.5">
                      <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        Offending draft
                      </p>
                      <p className="text-xs italic text-muted-foreground">“{r.detail}”</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            No refusals recorded yet.
          </div>
        )}
      </section>

      {/* Per-agent panels */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">Agent guardrails</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data?.agents ?? []).map((a) => (
            <div key={a.key} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2">
                {a.usesAI ? (
                  <Bot className="size-4 text-primary" />
                ) : (
                  <Cpu className="size-4 text-muted-foreground" />
                )}
                <span className="text-sm font-semibold">{a.name}</span>
                <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                  {a.usesAI ? "AI" : "Code"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.allowlist.length ? (
                  a.allowlist.map((t) => (
                    <span key={t} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No tools (disabled)</span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-money-recovered">
                  <ShieldCheck className="size-3.5" /> {a.allowedCalls} allowed
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <Ban className="size-3.5" /> {a.blockedCalls} blocked
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{a.abstentionRule}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}
