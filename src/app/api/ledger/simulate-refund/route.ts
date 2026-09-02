import { NextResponse } from "next/server";
import { parseJson, ok, badRequest } from "@/lib/api";
import { prisma } from "@/lib/db";
import { SimulateRefundSchema } from "@/lib/schemas";
import { recordRefund, computeTotals } from "@/lib/services/ledger";
import { sessionWithPerm } from "@/lib/auth/current";

/**
 * Simulate a refund landing on a recovered case. Appends a NEGATIVE ledger
 * entry (append-only) so net auto-corrects — the recovery is never edited.
 */
export async function POST(request: Request) {
  if (!(await sessionWithPerm("ledgerTools"))) {
    return NextResponse.json({ error: "Not permitted for your role" }, { status: 403 });
  }
  const parsed = await parseJson(SimulateRefundSchema, request);
  if (!parsed.ok) return parsed.res;

  // Target the given case, or pick a recovered one that hasn't been refunded.
  const target = parsed.data.caseId
    ? await prisma.case.findUnique({ where: { id: parsed.data.caseId } })
    : await prisma.case.findFirst({
        where: { recoveryAttribution: { gt: 0 }, reversalStatus: { not: "refunded" } },
        orderBy: { recoveryAttribution: "desc" },
      });

  if (!target) return badRequest("No recovered case available to refund");
  if (target.recoveryAttribution <= 0) {
    return badRequest("Case has no recovery to refund");
  }

  const entry = await recordRefund(
    target.id,
    target.recoveryAttribution,
    `Refund landed on ${target.entityId} — auto-subtracted from net`,
  );
  await prisma.case.update({
    where: { id: target.id },
    data: { reversalStatus: "refunded", actionResult: "refunded" },
  });

  const totals = await computeTotals();
  return ok({ entry, totals, caseId: target.id, amount: target.recoveryAttribution });
}
