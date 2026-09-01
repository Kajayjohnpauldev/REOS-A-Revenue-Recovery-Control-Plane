import { parseQuery, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { LedgerQuerySchema } from "@/lib/schemas";
import { sumTotals } from "@/lib/services/ledger";

export async function GET(request: Request) {
  const parsed = parseQuery(LedgerQuerySchema, request.url);
  if (!parsed.ok) return parsed.res;
  const { lane, type } = parsed.data;

  const where: Prisma.LedgerEntryWhereInput = {
    ...(type ? { type } : {}),
    ...(lane ? { case: { lane } } : {}),
  };

  const entries = await prisma.ledgerEntry.findMany({
    where,
    include: { case: { select: { lane: true, entityId: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totals = sumTotals(entries.map((e) => ({ amount: e.amount })));
  return ok({ entries, totals });
}
