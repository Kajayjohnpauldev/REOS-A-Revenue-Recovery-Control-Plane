import { prisma } from "@/lib/db";
import { computeTotals, type Totals } from "@/lib/services/ledger";
import { LANES, type LaneName } from "@/lib/types";

/**
 * metrics.ts — the scoreboard. All ten measures, computed from the immutable
 * data. Merchant recovery and (hypothetical) platform value are kept separate.
 */

export type Metrics = {
  atRiskValue: number;
  eligibleRate: number; // 0..1
  recoveryRate: number; // 0..1
  grossRecovered: number;
  incrementalRecovered: number;
  netRecovered: number;
  falseActionRate: number; // 0..1
  customerHarmRate: number; // 0..1
  automationVsEscalation: {
    automated: number;
    escalated: number;
    automationRate: number; // 0..1
  };
  auditCompleteness: number; // 0..1
  totals: Totals;
  counts: {
    total: number;
    eligible: number;
    recovered: number;
    treatment: number;
    holdout: number;
    harmPrevented: number;
  };
};

/**
 * Incremental = treatment recovered minus what treatment WOULD have recovered
 * at the holdout group's natural (untreated) rate. Pure + testable.
 */
export function computeIncremental(input: {
  treatmentRecoveredValue: number;
  treatmentTotalValue: number;
  holdoutRecoveredValue: number;
  holdoutTotalValue: number;
}): number {
  const holdoutRate =
    input.holdoutTotalValue > 0
      ? input.holdoutRecoveredValue / input.holdoutTotalValue
      : 0;
  const baseline = input.treatmentTotalValue * holdoutRate;
  return Math.round(input.treatmentRecoveredValue - baseline);
}

const RECOVERED = (c: { actionResult: string | null; recoveryAttribution: number }) =>
  c.actionResult === "recovered" || c.recoveryAttribution > 0;

export async function computeAllMetrics(): Promise<Metrics> {
  const cases = await prisma.case.findMany({
    include: {
      holdout: { select: { group: true } },
      _count: { select: { events: true, ledgerEntries: true } },
    },
  });

  const total = cases.length;
  let eligible = 0;
  let recoveredCount = 0;
  let atRiskValue = 0;
  let treatment = 0;
  let holdout = 0;
  let treatmentTotalValue = 0;
  let treatmentRecoveredValue = 0;
  let holdoutTotalValue = 0;
  let holdoutRecoveredValue = 0;
  let automated = 0;
  let escalated = 0;
  let completeTrails = 0;
  let falseActions = 0;

  for (const c of cases) {
    const isEligible = !!c.proposedAction && c.proposedAction !== "noop";
    if (isEligible) eligible += 1;

    const recovered = RECOVERED(c);
    if (recovered) recoveredCount += 1;

    const isOpen = !recovered && c.reasonCode !== "already_paid" && c.reasonCode !== "already_settled";
    if (isOpen) atRiskValue += c.amount;

    if (c.holdout?.group === "holdout") {
      holdout += 1;
      holdoutTotalValue += c.amount;
      holdoutRecoveredValue += c.recoveryAttribution;
    } else {
      treatment += 1;
      treatmentTotalValue += c.amount;
      treatmentRecoveredValue += c.recoveryAttribution;
    }

    if (c.approvalState === "auto_approved" || c.approvalState === "approved") automated += 1;
    if (c.approvalState === "escalated") escalated += 1;

    // Complete trail: has an event, a reasonCode, and (if it moved money) a ledger row.
    const movedMoney = recovered;
    const hasTrail = c._count.events > 0 && !!c.reasonCode && (!movedMoney || c._count.ledgerEntries > 0);
    if (hasTrail) completeTrails += 1;

    // False action: acted (money moved) on a case that was already paid.
    if (c.reasonCode === "already_paid" && c.recoveryAttribution > 0) falseActions += 1;
  }

  const totals = await computeTotals();

  // Customer harm: harmful messages that actually reached a customer (sent while
  // failing the dark-pattern screen or without consent). Prevented ones don't
  // count as harm — they count as harm PREVENTED.
  const sentMessages = await prisma.message.count({ where: { status: "sent" } });
  const harmfulSent = await prisma.message.count({
    where: { status: "sent", OR: [{ darkPatternPassed: false }, { consentChecked: false }] },
  });
  const rejectedMessages = await prisma.message.count({ where: { darkPatternPassed: false } });
  const blockedTools = await prisma.toolCall.count({ where: { allowed: false } });

  const actioned = automated + escalated;

  return {
    atRiskValue,
    eligibleRate: total ? eligible / total : 0,
    recoveryRate: eligible ? recoveredCount / eligible : 0,
    grossRecovered: totals.gross,
    incrementalRecovered: computeIncremental({
      treatmentRecoveredValue,
      treatmentTotalValue,
      holdoutRecoveredValue,
      holdoutTotalValue,
    }),
    netRecovered: totals.net,
    falseActionRate: actioned ? falseActions / actioned : 0,
    customerHarmRate: sentMessages ? harmfulSent / sentMessages : 0,
    automationVsEscalation: {
      automated,
      escalated,
      automationRate: actioned ? automated / actioned : 0,
    },
    auditCompleteness: total ? completeTrails / total : 0,
    totals,
    counts: {
      total,
      eligible,
      recovered: recoveredCount,
      treatment,
      holdout,
      harmPrevented: rejectedMessages + blockedTools,
    },
  };
}

export type LaneSummary = {
  lane: LaneName;
  count: number;
  atRiskValue: number;
  recoveredValue: number;
};

export async function getLaneSummaries(): Promise<LaneSummary[]> {
  const cases = await prisma.case.findMany({
    select: {
      lane: true,
      amount: true,
      recoveryAttribution: true,
      actionResult: true,
      reasonCode: true,
    },
  });
  return LANES.map((lane) => {
    const inLane = cases.filter((c) => c.lane === lane);
    const recoveredValue = inLane.reduce((s, c) => s + c.recoveryAttribution, 0);
    const atRiskValue = inLane
      .filter(
        (c) =>
          c.actionResult !== "recovered" &&
          c.recoveryAttribution === 0 &&
          c.reasonCode !== "already_paid",
      )
      .reduce((s, c) => s + c.amount, 0);
    return { lane, count: inLane.length, atRiskValue, recoveredValue };
  });
}

export type TrendPoint = { date: string; recovered: number; refunds: number; net: number };

/** Cumulative recovery trend from the immutable ledger, by day. */
export async function getRecoveryTrend(): Promise<TrendPoint[]> {
  const entries = await prisma.ledgerEntry.findMany({
    orderBy: { createdAt: "asc" },
    select: { amount: true, createdAt: true },
  });
  const byDay = new Map<string, { recovered: number; refunds: number }>();
  for (const e of entries) {
    const day = e.createdAt.toISOString().slice(0, 10);
    const cur = byDay.get(day) ?? { recovered: 0, refunds: 0 };
    if (e.amount >= 0) cur.recovered += e.amount;
    else cur.refunds += -e.amount;
    byDay.set(day, cur);
  }
  let cumRecovered = 0;
  let cumRefunds = 0;
  return [...byDay.entries()].map(([date, v]) => {
    cumRecovered += v.recovered;
    cumRefunds += v.refunds;
    return { date, recovered: cumRecovered, refunds: cumRefunds, net: cumRecovered - cumRefunds };
  });
}
