import { prisma } from "@/lib/db";
import { getRazorpayAdapter } from "@/lib/razorpay";
import type { EntityType } from "@/lib/razorpay/adapter";
import { recordRecovery } from "@/lib/services/ledger";
import { recordToolCall } from "@/lib/services/actions";
import { SETTLED_STATUSES } from "@/lib/types";

/**
 * caseActions — the operator decision handler. Approving EXECUTES the proposed
 * action, models the intervention succeeding, then RE-READS live state; a
 * recovery is appended to the ledger ONLY when that re-read shows a settled
 * (verified) capture. reject/escalate/hold never move money.
 */

export type ActionKind = "approve" | "reject" | "escalate" | "hold";

export type CaseActionResult = {
  caseId: string;
  action: ActionKind;
  approvalState: string;
  recovered: boolean;
  ledgerEntryId?: string;
  liveStatus?: string;
  note: string;
};

const APPROVAL_STATE: Record<ActionKind, string> = {
  approve: "approved",
  reject: "rejected",
  escalate: "escalated",
  hold: "hold",
};

export async function applyAction(input: {
  caseId: string;
  action: ActionKind;
  note?: string;
  userId?: string;
}): Promise<CaseActionResult | null> {
  const c = await prisma.case.findUnique({ where: { id: input.caseId } });
  if (!c) return null;

  const userId =
    input.userId ?? (await prisma.user.findFirst())?.id ?? "system";

  await prisma.humanDecision.create({
    data: {
      caseId: c.id,
      userId,
      decision: input.action,
      note: input.note ?? null,
    },
  });

  const approvalState = APPROVAL_STATE[input.action];

  if (input.action !== "approve") {
    await prisma.case.update({ where: { id: c.id }, data: { approvalState } });
    return {
      caseId: c.id,
      action: input.action,
      approvalState,
      recovered: false,
      note: `Marked ${approvalState}.`,
    };
  }

  // APPROVE — execute, model success, then verify by re-reading live state.
  const rz = getRazorpayAdapter();
  await recordToolCall(
    c.id,
    "orchestrator",
    "operator.executeApproved",
    { entityId: c.entityId, action: c.proposedAction },
    { ok: true },
    true,
  );

  if (rz.markRecovered) {
    await rz.markRecovered(c.entityType as EntityType, c.entityId);
  }
  const live = await rz.getEntityState(c.entityType as EntityType, c.entityId);
  const settled = SETTLED_STATUSES.includes(live.status);

  if (settled && c.recoveryAttribution === 0) {
    const entry = await recordRecovery(
      c.id,
      c.amount,
      `Operator-approved recovery (verified ${live.status})`,
    );
    await prisma.case.update({
      where: { id: c.id },
      data: {
        approvalState: "approved",
        actionResult: "recovered",
        recoveryAttribution: c.amount,
        currentState: live.status,
      },
    });
    return {
      caseId: c.id,
      action: "approve",
      approvalState: "approved",
      recovered: true,
      ledgerEntryId: entry.id,
      liveStatus: live.status,
      note: `Recovered ₹${c.amount.toLocaleString("en-IN")} (verified ${live.status}).`,
    };
  }

  await prisma.case.update({
    where: { id: c.id },
    data: {
      approvalState: "approved",
      actionResult: c.actionResult ?? "pending",
      currentState: live.status,
    },
  });
  return {
    caseId: c.id,
    action: "approve",
    approvalState: "approved",
    recovered: false,
    liveStatus: live.status,
    note: `Action executed; awaiting verified capture (live ${live.status}).`,
  };
}
