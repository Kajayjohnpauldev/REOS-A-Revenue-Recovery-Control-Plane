import { ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { AGENTS, resolveAllowlist } from "@/lib/agents/registry";

type Refusal = {
  id: string;
  kind: "blocked_tool" | "rejected_message";
  agent: string;
  rule: string;
  attempted: string;
  caseId: string;
  lane: string;
  entityId: string;
  customerName: string;
  createdAt: string;
  detail?: string;
};

function ruleFromResult(result: unknown): string {
  if (result && typeof result === "object" && "rule" in result) {
    return String((result as { rule: unknown }).rule);
  }
  return "blocked";
}

export async function GET() {
  const [blockedTools, rejectedMessages] = await Promise.all([
    prisma.toolCall.findMany({
      where: { allowed: false },
      include: { case: { select: { lane: true, entityId: true, customerName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.message.findMany({
      where: { darkPatternPassed: false },
      include: { case: { select: { lane: true, entityId: true, customerName: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const refusals: Refusal[] = [
    ...blockedTools.map((t) => ({
      id: t.id,
      kind: "blocked_tool" as const,
      agent: t.agent,
      rule: ruleFromResult(t.result),
      attempted: t.tool,
      caseId: t.caseId,
      lane: t.case.lane,
      entityId: t.case.entityId,
      customerName: t.case.customerName,
      createdAt: t.createdAt.toISOString(),
    })),
    ...rejectedMessages.map((m) => ({
      id: m.id,
      kind: "rejected_message" as const,
      agent: "communicator",
      rule: "dark_pattern_screen",
      attempted: `${m.channel} message`,
      caseId: m.caseId,
      lane: m.case.lane,
      entityId: m.case.entityId,
      customerName: m.case.customerName,
      createdAt: m.createdAt.toISOString(),
      detail: m.body,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const agents = await Promise.all(
    AGENTS.map(async (a) => {
      const [allowed, blocked] = await Promise.all([
        prisma.toolCall.count({ where: { agent: a.key, allowed: true } }),
        prisma.toolCall.count({ where: { agent: a.key, allowed: false } }),
      ]);
      return {
        key: a.key,
        name: a.name,
        usesAI: a.usesAI,
        abstentionRule: a.abstentionRule,
        allowlist: await resolveAllowlist(a.key),
        allowedCalls: allowed,
        blockedCalls: blocked,
      };
    }),
  );

  return ok({
    refusals,
    agents,
    summary: {
      blockedTools: blockedTools.length,
      rejectedMessages: rejectedMessages.length,
      total: refusals.length,
    },
  });
}
