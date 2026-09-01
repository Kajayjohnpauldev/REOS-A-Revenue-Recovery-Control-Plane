import { ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { scoreCase } from "@/lib/services/decision";
import { getActivePolicyLike } from "@/lib/services/policyStore";
import type { CaseLike } from "@/lib/types";

export async function GET() {
  const policy = await getActivePolicyLike();
  const cases = await prisma.case.findMany({
    where: { approvalState: "pending" },
    include: {
      messages: {
        where: { status: "drafted" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { amount: "desc" },
  });

  const items = cases.map((c) => {
    const caseLike: CaseLike = {
      lane: c.lane,
      entityType: c.entityType,
      entityId: c.entityId,
      amount: c.amount,
      currentState: c.currentState,
      failureClass: c.failureClass,
      attemptCount: c.attemptCount,
      consentState: c.consentState,
      dueAt: c.dueAt,
    };
    return {
      case: c,
      decision: scoreCase(caseLike, policy),
      draftedMessage: c.messages[0] ?? null,
    };
  });

  return ok({ items, total: items.length });
}
