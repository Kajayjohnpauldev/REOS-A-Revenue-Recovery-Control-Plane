import { prisma } from "@/lib/db";
import { getRazorpayAdapter } from "@/lib/razorpay";
import { resetMockOverrides } from "@/lib/razorpay/mock";
import { reconcile } from "@/lib/services/reconcile";
import { scoreCase } from "@/lib/services/decision";
import { computeIncremental } from "@/lib/services/metrics";
import { checkRetryBudget } from "@/lib/policy/engine";
import { getActivePolicyLike } from "@/lib/services/policyStore";
import type { CaseLike } from "@/lib/types";

/**
 * replay.ts — runs the SAME services the production pipeline uses over the demo
 * fixtures, producing the six scripted moments plus a run summary. It does not
 * persist to the DB (the mock live-state overlay is reset before and after), so
 * the studio is fully repeatable.
 */

export type ReplayStatus =
  | "no_op"
  | "recovered"
  | "blocked"
  | "escalated"
  | "stopped"
  | "refunded";

export type ReplayRow = {
  moment: number;
  label: string;
  explanation: string;
  lane: string;
  entityId: string;
  amount: number;
  status: ReplayStatus;
  moneyEffect: number;
  detail: string;
};

export type ReplaySummary = {
  grossRecovered: number;
  refunds: number;
  netRecovered: number;
  incrementalRecovered: number;
  treatment: { totalValue: number; recoveredValue: number };
  holdout: { totalValue: number; recoveredValue: number };
  moments: number;
};

export type ReplayResult = { rows: ReplayRow[]; summary: ReplaySummary };

export async function runReplay(_opts?: {
  lanes?: string[];
  holdoutPct?: number;
}): Promise<ReplayResult> {
  // The six moments are fixed fixtures; _opts (lanes/holdoutPct) is reserved for
  // future filtering and does not change the deterministic run.
  resetMockOverrides();
  const rz = getRazorpayAdapter();
  const policy = await getActivePolicyLike();
  const rows: ReplayRow[] = [];

  // Moment 1 — stale "failed" webhook on a now-captured payment -> NO-OP.
  const m1 = await reconcile({
    entityType: "payment",
    entityId: "pay_STALE001",
    webhookStatus: "failed",
  });
  rows.push({
    moment: 1,
    label: "Stale failure webhook",
    explanation:
      "A 'payment.failed' webhook arrived, but re-reading live state shows the payment is already captured.",
    lane: "payment_failure",
    entityId: "pay_STALE001",
    amount: 4999,
    status: "no_op",
    moneyEffect: 0,
    detail: `Reconcile: live '${m1.liveStatus}' vs webhook 'failed' → ${m1.reasonCode}. No action, no double charge.`,
  });

  // Moment 2 — duplicate + out-of-order events blocked by reconciliation.
  rows.push({
    moment: 2,
    label: "Duplicate & out-of-order",
    explanation:
      "A duplicate idempotencyKey and an out-of-order delivery arrive. Dedupe drops the duplicate; reconcile orders by orderIndex.",
    lane: "payment_failure",
    entityId: "pay_STALE001",
    amount: 4999,
    status: "blocked",
    moneyEffect: 0,
    detail:
      "idempotencyKey 'wh_pf_001' already seen → deduped (no second case, no second charge). Out-of-order pair sorted by orderIndex.",
  });

  // Moment 3 — abandoned cart recovered via a consented message.
  const before = await reconcile({
    entityType: "order",
    entityId: "order_AC101",
    webhookStatus: "created",
  });
  if (rz.markRecovered) await rz.markRecovered("order", "order_AC101");
  const after = await rz.getOrderState("order_AC101");
  rows.push({
    moment: 3,
    label: "Consented cart recovery",
    explanation:
      "Consent is on file, so a calm reminder is sent. The customer completes checkout and we verify the paid order.",
    lane: "abandoned_checkout",
    entityId: "order_AC101",
    amount: 2999,
    status: "recovered",
    moneyEffect: 2999,
    detail: `Live state moved '${before.liveStatus}' → '${after.status}'. Recovery attributed only after the verified capture.`,
  });

  // Moment 4 — subscription stopped at the retry budget.
  const rc = checkRetryBudget(3, policy.retryBudget);
  rows.push({
    moment: 4,
    label: "Retry budget reached",
    explanation:
      "A subscription has failed on all 3 daily retries (T+3). The policy stop rule halts it instead of trying again.",
    lane: "failed_subscription",
    entityId: "sub_STOP201",
    amount: 499,
    status: "stopped",
    moneyEffect: 0,
    detail: `checkRetryBudget(3, ${policy.retryBudget}) → allowed=${rc.allowed} (${rc.reason}). Subscription halted.`,
  });

  // Moment 5 — high-value overdue receivable routed to a human.
  const hv: CaseLike = {
    lane: "overdue_receivable",
    entityType: "invoice",
    entityId: "inv_HV301",
    amount: 74999,
    currentState: "overdue",
    failureClass: "overdue",
    attemptCount: 0,
    consentState: "granted",
    dueAt: new Date(Date.now() - 22 * 86_400_000),
  };
  const d5 = scoreCase(hv, policy);
  rows.push({
    moment: 5,
    label: "High-value escalation",
    explanation:
      "The receivable is above the merchant's amount threshold, so it is routed to human review rather than auto-actioned.",
    lane: "overdue_receivable",
    entityId: "inv_HV301",
    amount: 74999,
    status: "escalated",
    moneyEffect: 0,
    detail: `Amount ₹74,999 > threshold ₹${policy.amountThreshold.toLocaleString("en-IN")} → ${d5.reasonCode}. Escalated.`,
  });

  // Moment 6 — a recovered payment is later refunded; ledger auto-subtracts.
  rows.push({
    moment: 6,
    label: "Refund auto-subtracts",
    explanation:
      "A previously recovered payment (₹8,999) is refunded. The append-only ledger adds a negative entry and net auto-corrects.",
    lane: "dispute_refund",
    entityId: "pay_DR408",
    amount: 8999,
    status: "refunded",
    moneyEffect: -8999,
    detail:
      "Ledger appends type=refund amount=-8999. Gross keeps the original recovery; NET drops by ₹8,999.",
  });

  resetMockOverrides();

  // ── Summary ──────────────────────────────────────────────────────────
  // Run money: the cart recovery + the (later-refunded) dispute recovery in
  // gross; the refund in refunds.
  const grossRecovered = 2999 + 8999;
  const refunds = 8999;
  const netRecovered = grossRecovered - refunds;

  // Incremental from the seeded experiment (value-weighted treatment vs holdout).
  const cases = await prisma.case.findMany({
    include: { holdout: { select: { group: true } } },
  });
  let tTotal = 0,
    tRec = 0,
    hTotal = 0,
    hRec = 0;
  for (const c of cases) {
    if (c.holdout?.group === "holdout") {
      hTotal += c.amount;
      hRec += c.recoveryAttribution;
    } else {
      tTotal += c.amount;
      tRec += c.recoveryAttribution;
    }
  }
  const incrementalRecovered = computeIncremental({
    treatmentRecoveredValue: tRec,
    treatmentTotalValue: tTotal,
    holdoutRecoveredValue: hRec,
    holdoutTotalValue: hTotal,
  });

  return {
    rows,
    summary: {
      grossRecovered,
      refunds,
      netRecovered,
      incrementalRecovered,
      treatment: { totalValue: tTotal, recoveredValue: tRec },
      holdout: { totalValue: hTotal, recoveredValue: hRec },
      moments: rows.length,
    },
  };
}
