/** Shared domain types used across the engine, API, and UI. */

export const LANES = [
  "payment_failure",
  "abandoned_checkout",
  "failed_subscription",
  "overdue_receivable",
  "dispute_refund",
] as const;
export type LaneName = (typeof LANES)[number];

export const LANE_LABELS: Record<LaneName, string> = {
  payment_failure: "Payment failure",
  abandoned_checkout: "Abandoned checkout",
  failed_subscription: "Failed subscription",
  overdue_receivable: "Overdue receivable",
  dispute_refund: "Dispute / refund",
};

export type ConsentState = "granted" | "denied" | "unknown";

export type ApprovalState =
  | "none"
  | "pending"
  | "auto_approved"
  | "approved"
  | "rejected"
  | "escalated"
  | "hold";

export type ActionResult =
  | "recovered"
  | "pending"
  | "noop"
  | "escalated"
  | "blocked"
  | "refunded"
  | "halted";

/** A subset of Policy fields the pure engine needs (DB-free). */
export type PolicyLike = {
  version: number;
  retryBudget: number;
  amountThreshold: number;
  dueAgeDays: number;
  allowedChannels: string; // csv, e.g. "email,sms"
  maxDiscountPct: number;
  autoApproveClasses: string; // csv
  consentRequired: boolean;
};

/** A subset of Case fields the pure engine needs (DB-free). */
export type CaseLike = {
  lane: string;
  entityType: string;
  entityId: string;
  amount: number;
  currentState: string;
  failureClass?: string | null;
  attemptCount: number;
  consentState: string;
  dueAt?: Date | null;
  createdAt?: Date;
};

export type DecisionComponents = {
  probability: number;
  urgency: number;
  grossExpected: number;
  expectedCost: number;
  harmRisk: number;
};

export type Decision = {
  proposedAction: string;
  reasonCode: string;
  confidence: number;
  expectedNetRecovery: number;
  approvalState: ApprovalState;
  escalate: boolean;
  noop: boolean;
  requiresApproval: boolean;
  policyVersion: number | null;
  components: DecisionComponents;
};

/** Settled statuses — a live entity in one of these needs no recovery action. */
export const SETTLED_STATUSES = [
  "captured",
  "paid",
  "active",
  "charged",
  "won",
  "completed",
];

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function parseCsv(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}
