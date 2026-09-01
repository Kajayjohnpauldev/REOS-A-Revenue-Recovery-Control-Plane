import { getAIProvider } from "@/lib/ai";
import type { ClassifyOutput } from "@/lib/ai/provider";
import type { CaseLike } from "@/lib/types";

/**
 * Classifier (AI) — status + error code -> failureClass + reasonCode +
 * confidence. Abstains on an unrecognisable signal so the caller can escalate.
 */
export async function classify(
  c: CaseLike,
  signal?: { errorCode?: string; errorDescription?: string },
): Promise<ClassifyOutput> {
  const ai = getAIProvider();
  return ai.classify({
    lane: c.lane,
    entityType: c.entityType,
    status: c.currentState,
    errorCode: signal?.errorCode,
    errorDescription: signal?.errorDescription,
    amount: c.amount,
    attemptCount: c.attemptCount,
  });
}
