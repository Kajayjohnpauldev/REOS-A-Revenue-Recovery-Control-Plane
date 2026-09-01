import {
  clamp,
  type CaseLike,
  type Decision,
  type ApprovalState,
  type PolicyLike,
} from "@/lib/types";
import {
  ageInDays,
  checkRetryBudget,
  consentSatisfied,
  isAutoApprovable,
  isOverdueEligible,
  requiresEscalation,
} from "@/lib/policy/engine";

/**
 * decision.ts — the scoring + action-selection layer.
 *
 *   expectedNetRecovery = amount * probability * urgency
 *                         - expectedCost - harmRisk
 *
 * Probability is rule-based today with a documented hook to learn it from
 * outcomes later. This layer NEVER moves money — it only proposes an action,
 * a reasonCode, a confidence, and the policyVersion it was decided under.
 */

const BASE_PROBABILITY: Record<string, number> = {
  low_value_retry: 0.7,
  network_error: 0.6,
  insufficient_funds: 0.45,
  expired_card: 0.4,
  card_declined: 0.3,
  overdue: 0.5,
  abandoned: 0.35,
  dispute: 0.25,
  chargeback_recovered: 0.5,
};

export const MESSAGING_ACTIONS = new Set([
  "send_retry_link",
  "send_reminder",
  "send_invoice_reminder",
]);

const ACTION_COST: Record<string, number> = {
  retry_charge: 0,
  send_retry_link: 5,
  send_reminder: 5,
  send_invoice_reminder: 5,
  halt_and_notify: 2,
  escalate_to_human: 50,
  submit_evidence: 100,
  noop: 0,
};

/**
 * Rule-based recovery probability.
 * // TODO(revivalos): replace with a model learned from realised outcomes; the
 * // shape (base rate per failure class, eroded by attempts) is the hook.
 */
export function recoveryProbability(c: CaseLike): number {
  let p = BASE_PROBABILITY[c.failureClass ?? ""] ?? 0.3;
  if (c.attemptCount >= 2) p -= 0.1 * (c.attemptCount - 1);
  return clamp(p, 0.05, 0.95);
}

export function urgency(
  c: CaseLike,
  policy: PolicyLike,
  now: Date = new Date(),
): number {
  if (c.lane === "overdue_receivable") {
    const age = ageInDays(c.dueAt, now) ?? 0;
    return clamp(1 + age / (policy.dueAgeDays * 4), 0.8, 1.5);
  }
  if (c.lane === "abandoned_checkout") return 1.2; // intent decays fast
  return 1.0;
}

type ChosenAction = { action: string; reasonCode: string; escalate: boolean };

function chooseAction(c: CaseLike, policy: PolicyLike, now: Date): ChosenAction {
  switch (c.lane) {
    case "payment_failure": {
      if (requiresEscalation(c.amount, policy)) {
        return {
          action: "escalate_to_human",
          reasonCode: "high_value_escalation",
          escalate: true,
        };
      }
      if (c.failureClass === "low_value_retry" || c.failureClass === "network_error") {
        return { action: "retry_charge", reasonCode: "retryable_transient", escalate: false };
      }
      return {
        action: "send_retry_link",
        reasonCode: "retryable_with_customer_action",
        escalate: false,
      };
    }
    case "abandoned_checkout": {
      if (!consentSatisfied(c.consentState, policy)) {
        return { action: "noop", reasonCode: "no_consent", escalate: false };
      }
      return { action: "send_reminder", reasonCode: "consented_reminder_eligible", escalate: false };
    }
    case "failed_subscription": {
      const rc = checkRetryBudget(c.attemptCount, policy.retryBudget);
      if (!rc.allowed) {
        return { action: "halt_and_notify", reasonCode: "retry_budget_exhausted", escalate: false };
      }
      return { action: "retry_charge", reasonCode: "within_retry_budget", escalate: false };
    }
    case "overdue_receivable": {
      if (requiresEscalation(c.amount, policy)) {
        return {
          action: "escalate_to_human",
          reasonCode: "high_value_escalation",
          escalate: true,
        };
      }
      if (isOverdueEligible(c.dueAt, policy, now)) {
        return {
          action: "send_invoice_reminder",
          reasonCode: "reminder_eligible",
          escalate: false,
        };
      }
      return { action: "noop", reasonCode: "not_yet_due", escalate: false };
    }
    case "dispute_refund": {
      return { action: "submit_evidence", reasonCode: "dispute_evidence_required", escalate: false };
    }
    default:
      return { action: "noop", reasonCode: "unknown_lane", escalate: false };
  }
}

function harmRisk(action: string, c: CaseLike, policy: PolicyLike): number {
  if (!MESSAGING_ACTIONS.has(action)) return 0;
  // Messaging without consent is a real customer-harm risk; the engine prices
  // it heavily so those actions never win. (chooseAction already no-ops them.)
  return consentSatisfied(c.consentState, policy)
    ? Math.round(c.amount * 0.01)
    : Math.round(c.amount * 0.5);
}

function approvalFor(
  action: string,
  escalate: boolean,
  c: CaseLike,
  policy: PolicyLike,
): ApprovalState {
  if (escalate) return "escalated";
  if (action === "noop") return "none";
  if (action === "halt_and_notify") return "auto_approved"; // policy-driven stop
  if (isAutoApprovable(c.failureClass, c.amount, policy) && consentSatisfied(c.consentState, policy)) {
    return "auto_approved";
  }
  return "pending";
}

function confidenceFor(
  action: string,
  reasonCode: string,
  probability: number,
): number {
  if (reasonCode === "no_consent" || reasonCode === "retry_budget_exhausted") return 0.95;
  if (action === "escalate_to_human") return 0.5;
  if (action === "submit_evidence") return 0.45;
  if (action === "noop") return 0.8;
  return clamp(probability, 0.3, 0.9);
}

export function scoreCase(
  c: CaseLike,
  policy: PolicyLike,
  now: Date = new Date(),
): Decision {
  const probability = recoveryProbability(c);
  const u = urgency(c, policy, now);
  const grossExpected = Math.round(c.amount * probability * u);

  const { action, reasonCode, escalate } = chooseAction(c, policy, now);
  const expectedCost = ACTION_COST[action] ?? 0;
  const harm = harmRisk(action, c, policy);
  const noop = action === "noop";

  const expectedNetRecovery = noop
    ? 0
    : Math.round(grossExpected - expectedCost - harm);

  const approvalState = approvalFor(action, escalate, c, policy);

  return {
    proposedAction: action,
    reasonCode,
    confidence: confidenceFor(action, reasonCode, probability),
    expectedNetRecovery,
    approvalState,
    escalate,
    noop,
    requiresApproval: approvalState === "pending",
    policyVersion: policy.version,
    components: {
      probability,
      urgency: u,
      grossExpected,
      expectedCost,
      harmRisk: harm,
    },
  };
}
