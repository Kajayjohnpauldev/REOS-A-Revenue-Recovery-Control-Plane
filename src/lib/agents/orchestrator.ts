import { reconcile, type ReconcileResult } from "@/lib/services/reconcile";
import { scoreCase, MESSAGING_ACTIONS } from "@/lib/services/decision";
import type { ClassifyOutput } from "@/lib/ai/provider";
import type { CaseLike, Decision, PolicyLike } from "@/lib/types";
import { classify } from "./classifier";

/**
 * Orchestrator (deterministic, read-only) — coordinates a verified case through
 * the pipeline: reconcile (re-read live state) -> classify -> decide. It never
 * executes actions; it produces a plan, and abstains/escalates when it cannot be
 * sure. Execution is the bounded action layer's job.
 */

export type Route = "no_op" | "automate" | "message" | "escalate" | "stop";

export type Plan = {
  reconcile: ReconcileResult;
  classification?: ClassifyOutput;
  decision?: Decision;
  abstained: boolean;
  route: Route;
  reason: string;
};

export async function planCase(input: {
  c: CaseLike;
  policy: PolicyLike;
  webhookStatus?: string;
  signal?: { errorCode?: string; errorDescription?: string };
  now?: Date;
}): Promise<Plan> {
  const { c, policy } = input;

  // 1. Reconcile — a stale failure webhook on a settled entity is a no-op.
  const rec = await reconcile({
    entityType: c.entityType,
    entityId: c.entityId,
    webhookStatus: input.webhookStatus ?? c.currentState,
  });
  if (rec.noop) {
    return { reconcile: rec, abstained: false, route: "no_op", reason: rec.reasonCode };
  }
  if (rec.reasonCode === "live_state_unavailable") {
    return {
      reconcile: rec,
      abstained: true,
      route: "escalate",
      reason: "live_state_unavailable",
    };
  }

  // 2. Classify — abstain -> escalate.
  const classification = await classify(c, input.signal);
  if (classification.abstained) {
    return {
      reconcile: rec,
      classification,
      abstained: true,
      route: "escalate",
      reason: "classifier_abstained",
    };
  }

  // 3. Decide — score under the current policy.
  const enriched: CaseLike = {
    ...c,
    failureClass: c.failureClass ?? classification.failureClass,
  };
  const decision = scoreCase(enriched, policy, input.now);

  const route: Route = decision.escalate
    ? "escalate"
    : decision.noop
      ? "no_op"
      : decision.proposedAction === "halt_and_notify"
        ? "stop"
        : MESSAGING_ACTIONS.has(decision.proposedAction)
          ? "message"
          : "automate";

  return {
    reconcile: rec,
    classification,
    decision,
    abstained: false,
    route,
    reason: decision.reasonCode,
  };
}
