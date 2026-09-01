import { parseCsv, type PolicyLike } from "@/lib/types";

/**
 * Policy engine — deterministic eligibility checks and STOP rules. All pure
 * functions so they can be unit-tested without a database.
 */

export type RetryCheck = {
  allowed: boolean;
  reason: string;
  remaining: number;
};

/**
 * Subscription/retry STOP rule. Razorpay retries a failed auto-charge once per
 * day for 3 days (T+3); retryBudget is 3. Once attemptCount reaches the budget,
 * further retries are NOT allowed — "pending" is never treated as unlimited.
 */
export function checkRetryBudget(
  attemptCount: number,
  retryBudget: number,
): RetryCheck {
  if (attemptCount >= retryBudget) {
    return { allowed: false, reason: "retry_budget_exhausted", remaining: 0 };
  }
  return {
    allowed: true,
    reason: "within_retry_budget",
    remaining: retryBudget - attemptCount,
  };
}

export function isChannelAllowed(channel: string, policy: PolicyLike): boolean {
  return parseCsv(policy.allowedChannels).includes(channel);
}

export function isAutoApprovable(
  failureClass: string | null | undefined,
  amount: number,
  policy: PolicyLike,
): boolean {
  if (!failureClass) return false;
  return (
    parseCsv(policy.autoApproveClasses).includes(failureClass) &&
    amount <= policy.amountThreshold
  );
}

/** A case above the merchant's amount threshold must go to a human. */
export function requiresEscalation(amount: number, policy: PolicyLike): boolean {
  return amount > policy.amountThreshold;
}

export function ageInDays(
  date: Date | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!date) return null;
  return Math.floor((now.getTime() - new Date(date).getTime()) / 86_400_000);
}

export function isOverdueEligible(
  dueAt: Date | null | undefined,
  policy: PolicyLike,
  now: Date = new Date(),
): boolean {
  const age = ageInDays(dueAt, now);
  return age !== null && age >= policy.dueAgeDays;
}

/** Whether consent is satisfied for a customer-facing message. */
export function consentSatisfied(
  consentState: string,
  policy: PolicyLike,
): boolean {
  if (!policy.consentRequired) return true;
  return consentState === "granted";
}
