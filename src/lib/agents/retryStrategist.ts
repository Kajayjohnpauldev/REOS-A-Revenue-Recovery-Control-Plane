import { checkRetryBudget } from "@/lib/policy/engine";

/**
 * Retry Strategist (deterministic) — schedule the next retry within the fixed
 * T+3 budget. It CANNOT exceed the budget: once attemptCount reaches it, no
 * further attempt is scheduled (the subscription is halted instead).
 */
export type RetryPlan = {
  retry: boolean;
  reason: string;
  remaining: number;
  nextRetryAt: string | null;
};

export function planRetry(
  attemptCount: number,
  retryBudget: number,
  now: Date = new Date(),
): RetryPlan {
  const rc = checkRetryBudget(attemptCount, retryBudget);
  if (!rc.allowed) {
    return { retry: false, reason: rc.reason, remaining: 0, nextRetryAt: null };
  }
  // Razorpay retries once per day (T+1 within the T+3 window).
  const next = new Date(now.getTime() + 24 * 3_600_000);
  return {
    retry: true,
    reason: "scheduled",
    remaining: rc.remaining,
    nextRetryAt: next.toISOString(),
  };
}
