import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { verifyWebhookSignature } from "@/lib/razorpay/verifySignature";

/**
 * ingestion.ts — the front door. Verify the signature, store the RawEvent, and
 * DEDUPE on idempotencyKey so a duplicate delivery never creates a second case
 * or a second charge. Returns fast; heavier work happens downstream.
 */

export type IngestResult = {
  status: "accepted" | "duplicate" | "invalid_signature";
  deduped: boolean;
  idempotencyKey: string;
  rawEventId?: string;
  reason: string;
};

export async function ingestWebhook(input: {
  type: string;
  idempotencyKey: string;
  orderIndex: number;
  payload: unknown;
  caseId?: string | null;
  rawBody?: string;
  signature?: string;
}): Promise<IngestResult> {
  const raw = input.rawBody ?? JSON.stringify(input.payload ?? {});
  const sig = verifyWebhookSignature(raw, input.signature);
  if (!sig.valid) {
    return {
      status: "invalid_signature",
      deduped: false,
      idempotencyKey: input.idempotencyKey,
      reason: sig.reason,
    };
  }

  const existing = await prisma.rawEvent.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    select: { id: true },
  });
  if (existing) {
    return {
      status: "duplicate",
      deduped: true,
      idempotencyKey: input.idempotencyKey,
      rawEventId: existing.id,
      reason: "idempotency_key_seen",
    };
  }

  try {
    const created = await prisma.rawEvent.create({
      data: {
        type: input.type,
        payload: (input.payload ?? {}) as Prisma.InputJsonValue,
        idempotencyKey: input.idempotencyKey,
        orderIndex: input.orderIndex,
        ...(input.caseId ? { caseId: input.caseId } : {}),
      },
      select: { id: true },
    });
    return {
      status: "accepted",
      deduped: false,
      idempotencyKey: input.idempotencyKey,
      rawEventId: created.id,
      reason: "stored",
    };
  } catch (e) {
    // Lost a concurrent race on the unique key -> still a duplicate, not a crash.
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const dup = await prisma.rawEvent.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { id: true },
      });
      return {
        status: "duplicate",
        deduped: true,
        idempotencyKey: input.idempotencyKey,
        rawEventId: dup?.id,
        reason: "idempotency_race",
      };
    }
    throw e;
  }
}
