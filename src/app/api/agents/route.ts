import { ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { AGENTS, resolveAllowlist } from "@/lib/agents/registry";

export async function GET() {
  const agents = await Promise.all(
    AGENTS.map(async (a) => {
      const [allowlist, recent, allowed, blocked] = await Promise.all([
        resolveAllowlist(a.key),
        prisma.toolCall.findMany({
          where: { agent: a.key },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { case: { select: { entityId: true, lane: true } } },
        }),
        prisma.toolCall.count({ where: { agent: a.key, allowed: true } }),
        prisma.toolCall.count({ where: { agent: a.key, allowed: false } }),
      ]);
      return {
        key: a.key,
        name: a.name,
        usesAI: a.usesAI,
        job: a.job,
        abstentionRule: a.abstentionRule,
        defaultAllowlist: a.defaultAllowlist,
        allowlist,
        recent,
        counts: { allowed, blocked },
      };
    }),
  );
  return ok({ agents });
}
