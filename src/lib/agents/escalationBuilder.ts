import { ageInDays } from "@/lib/policy/engine";
import type { CaseLike } from "@/lib/types";

/**
 * Escalation Builder (deterministic) — assemble a concise evidence packet for a
 * human. Assembles context only; a human makes the call.
 */
export type EvidencePacket = {
  entityId: string;
  lane: string;
  amount: number;
  ageDays: number | null;
  failureClass: string | null;
  attemptCount: number;
  consentState: string;
  summary: string;
};

export function buildPacket(
  c: CaseLike & { failureClass?: string | null },
  now: Date = new Date(),
): EvidencePacket {
  const ageDays = ageInDays(c.dueAt, now);
  const summary =
    `${c.entityType} ${c.entityId} · ₹${c.amount.toLocaleString("en-IN")} · ` +
    `${c.lane}${ageDays != null ? ` · ${ageDays}d overdue` : ""} · ` +
    `${c.attemptCount} attempt(s) · consent: ${c.consentState}`;
  return {
    entityId: c.entityId,
    lane: c.lane,
    amount: c.amount,
    ageDays,
    failureClass: c.failureClass ?? null,
    attemptCount: c.attemptCount,
    consentState: c.consentState,
    summary,
  };
}
