import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { CasesQuery } from "@/lib/schemas";

export type CaseListItem = Prisma.CaseGetPayload<{
  include: { holdout: { select: { group: true } } };
}>;

export async function listCases(q: CasesQuery): Promise<CaseListItem[]> {
  const where: Prisma.CaseWhereInput = {};
  if (q.lane) where.lane = q.lane;
  if (q.needsApproval === "true") where.approvalState = "pending";
  else if (q.approvalState) where.approvalState = q.approvalState;
  if (q.consentState) where.consentState = q.consentState;
  if (q.minAmount != null || q.maxAmount != null) {
    where.amount = {
      ...(q.minAmount != null ? { gte: q.minAmount } : {}),
      ...(q.maxAmount != null ? { lte: q.maxAmount } : {}),
    };
  }
  if (q.q) {
    const s = q.q;
    where.OR = [
      { id: { contains: s } },
      { entityId: { contains: s } },
      { lane: { contains: s } },
      { failureClass: { contains: s } },
      { reasonCode: { contains: s } },
    ];
  }
  return prisma.case.findMany({
    where,
    include: { holdout: { select: { group: true } } },
    orderBy: [{ amount: "desc" }, { createdAt: "desc" }],
  });
}
