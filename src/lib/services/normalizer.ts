import type { LaneName } from "@/lib/types";

/**
 * normalizer.ts — map a raw Razorpay-shaped webhook payload into one normalized
 * event that the rest of the pipeline understands, preserving source fields.
 */

export type NormalizedEvent = {
  type: string;
  lane: LaneName;
  entityType: string;
  entityId: string;
  status: string;
  amount: number;
  attempt?: number;
  reason?: string;
  orderIndex?: number;
};

export function laneForType(type: string): LaneName {
  if (type.startsWith("subscription.")) return "failed_subscription";
  if (type.startsWith("invoice.")) return "overdue_receivable";
  if (type.includes("dispute") || type.startsWith("refund.")) return "dispute_refund";
  if (type.startsWith("order.")) return "abandoned_checkout";
  return "payment_failure"; // payment.* and anything else
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}
function num(v: unknown, fallback = 0): number {
  return typeof v === "number" ? v : Number.isFinite(Number(v)) ? Number(v) : fallback;
}

export function normalize(input: {
  type: string;
  payload: Record<string, unknown>;
  orderIndex?: number;
}): NormalizedEvent {
  const p = input.payload ?? {};
  const lane = laneForType(input.type);
  return {
    type: input.type,
    lane,
    entityType: str(p.entity, lane.split("_")[0]),
    entityId: str(p.id ?? p.payment_id ?? p.entity_id),
    status: str(p.status, "unknown"),
    amount: num(p.amount),
    attempt: p.attempt != null ? num(p.attempt) : undefined,
    reason: p.error_description != null ? str(p.error_description) : p.reason != null ? str(p.reason) : undefined,
    orderIndex: input.orderIndex,
  };
}
