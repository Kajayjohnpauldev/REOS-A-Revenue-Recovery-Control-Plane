import { ok, notFound } from "@/lib/api";
import { loadCase, buildTimeline } from "@/lib/services/audit";
import { reconcile } from "@/lib/services/reconcile";
import { scoreCase } from "@/lib/services/decision";
import { getActivePolicyLike } from "@/lib/services/policyStore";
import type { CaseLike } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const c = await loadCase(id);
  if (!c) return notFound("Case not found");

  const policy = await getActivePolicyLike();
  const caseLike: CaseLike = {
    lane: c.lane,
    entityType: c.entityType,
    entityId: c.entityId,
    amount: c.amount,
    currentState: c.currentState,
    failureClass: c.failureClass,
    attemptCount: c.attemptCount,
    consentState: c.consentState,
    dueAt: c.dueAt,
    createdAt: c.createdAt,
  };

  const [rec, timeline] = await Promise.all([
    reconcile({
      entityType: c.entityType,
      entityId: c.entityId,
      webhookStatus: c.events[0]?.type.includes("failed") ? "failed" : c.currentState,
    }),
    Promise.resolve(buildTimeline(c)),
  ]);
  const decision = scoreCase(caseLike, policy);

  return ok({ case: c, timeline, reconcile: rec, decision });
}
