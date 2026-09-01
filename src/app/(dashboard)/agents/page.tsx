"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bot, Cpu, X, Plus, ShieldCheck, Ban } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgents, useSaveAllowlist } from "@/lib/hooks";
import { formatAge, titleCase } from "@/lib/format";
import type { AgentInfo } from "@/lib/api-types";

export default function AgentsPage() {
  const { data, isLoading } = useAgents();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        description="Seven roles — three use the LLM, three are deterministic — each with a fixed tool allowlist and an abstention rule."
      />
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data?.agents.map((a) => <AgentCard key={a.key} agent={a} />)}
        </div>
      )}
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentInfo }) {
  const save = useSaveAllowlist();
  const [tools, setTools] = useState<string[]>(agent.allowlist);
  const [draft, setDraft] = useState("");

  useEffect(() => setTools(agent.allowlist), [agent.allowlist]);

  const dirty = JSON.stringify(tools) !== JSON.stringify(agent.allowlist);

  const add = () => {
    const t = draft.trim();
    if (t && !tools.includes(t)) setTools([...tools, t]);
    setDraft("");
  };
  const remove = (t: string) => setTools(tools.filter((x) => x !== t));

  const persist = async () => {
    await save.mutateAsync({ agentKey: agent.key, allowlist: tools });
    toast.success(`${agent.name} allowlist saved`);
  };

  return (
    <div className="flex flex-col rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        {agent.usesAI ? (
          <Bot className="size-4.5 text-primary" />
        ) : (
          <Cpu className="size-4.5 text-muted-foreground" />
        )}
        <h2 className="text-sm font-semibold">{agent.name}</h2>
        <span className="ml-auto rounded bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
          {agent.usesAI ? "Uses AI" : "Deterministic"}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{agent.job}</p>

      {/* Allowlist editor */}
      <div className="mt-4">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Tool allowlist
        </p>
        <div className="flex flex-wrap gap-1.5">
          {tools.length ? (
            tools.map((t) => (
              <span key={t} className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                {t}
                <button type="button" onClick={() => remove(t)} className="text-muted-foreground hover:text-destructive">
                  <X className="size-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No tools — agent disabled</span>
          )}
        </div>
        <div className="mt-2 flex gap-1.5">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder="add a tool…"
            className="h-7 text-xs"
          />
          <Button size="icon-sm" variant="outline" onClick={add} aria-label="Add tool">
            <Plus className="size-3.5" />
          </Button>
          {dirty && (
            <Button size="sm" onClick={persist} disabled={save.isPending}>
              Save
            </Button>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Abstains:</span> {agent.abstentionRule}
      </p>

      {/* Recent decisions */}
      <div className="mt-3 border-t pt-3">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Recent decisions
        </p>
        {agent.recent.length ? (
          <ul className="space-y-1">
            {agent.recent.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-xs">
                {r.allowed ? (
                  <ShieldCheck className="size-3.5 shrink-0 text-money-recovered" />
                ) : (
                  <Ban className="size-3.5 shrink-0 text-destructive" />
                )}
                <span className="font-mono">{r.tool}</span>
                <span className="text-muted-foreground">· {r.case.entityId}</span>
                <span className="ml-auto text-muted-foreground">{formatAge(r.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No recent tool calls.</p>
        )}
      </div>
    </div>
  );
}
