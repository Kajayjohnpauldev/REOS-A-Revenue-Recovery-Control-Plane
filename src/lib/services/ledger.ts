import { prisma } from "@/lib/db";
import type { LedgerEntry, Prisma } from "@prisma/client";

/**
 * ledger.ts — the ONLY place money state changes.
 *
 * The ledger is APPEND-ONLY: `append` creates rows and NOTHING here ever updates
 * or deletes them. A refund/dispute-loss is a NEGATIVE amount entry that
 * auto-corrects the net. `computeTotals` derives gross/refunds/net from the
 * immutable log, so a refund can never leave a recovered amount overstated.
 */

export type Totals = { gross: number; refunds: number; net: number; count: number };

export type LedgerAppendInput = {
  caseId: string;
  type: string; // "recovery" | "refund" | "dispute_loss" | "adjustment" | ...
  amount: number; // positive for recovery, negative for refund/loss
  note: string;
  createdAt?: Date;
};

/** Append an immutable ledger entry. The single money-mutating operation. */
export async function append(entry: LedgerAppendInput): Promise<LedgerEntry> {
  return prisma.ledgerEntry.create({
    data: {
      caseId: entry.caseId,
      type: entry.type,
      amount: entry.amount,
      note: entry.note,
      ...(entry.createdAt ? { createdAt: entry.createdAt } : {}),
    },
  });
}

/** Convenience: record a verified recovery (positive). */
export function recordRecovery(caseId: string, amount: number, note: string) {
  return append({ caseId, type: "recovery", amount: Math.abs(amount), note });
}

/** Convenience: record a refund as a NEGATIVE entry that auto-subtracts. */
export function recordRefund(caseId: string, amount: number, note: string) {
  return append({ caseId, type: "refund", amount: -Math.abs(amount), note });
}

/** Pure: fold a list of entries into gross / refunds / net. */
export function sumTotals(entries: { amount: number }[]): Totals {
  let gross = 0;
  let refunds = 0;
  for (const e of entries) {
    if (e.amount >= 0) gross += e.amount;
    else refunds += -e.amount;
  }
  return { gross, refunds, net: gross - refunds, count: entries.length };
}

/** DB-backed totals, optionally scoped by a Prisma where filter. */
export async function computeTotals(
  where?: Prisma.LedgerEntryWhereInput,
): Promise<Totals> {
  const entries = await prisma.ledgerEntry.findMany({
    where,
    select: { amount: true },
  });
  return sumTotals(entries);
}
