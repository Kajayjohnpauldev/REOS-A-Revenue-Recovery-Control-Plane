import { scoreCase } from "@/lib/services/decision";
import type { CaseLike, Decision, PolicyLike } from "@/lib/types";

/**
 * Prioritiser (deterministic) — rank open cases by expected net recovery.
 * Pure code, no side effects.
 */
export type RankedCase<T extends CaseLike> = {
  case: T;
  decision: Decision;
};

export function rankCases<T extends CaseLike>(
  cases: T[],
  policy: PolicyLike,
  now: Date = new Date(),
): RankedCase<T>[] {
  return cases
    .map((c) => ({ case: c, decision: scoreCase(c, policy, now) }))
    .sort((a, b) => b.decision.expectedNetRecovery - a.decision.expectedNetRecovery);
}
