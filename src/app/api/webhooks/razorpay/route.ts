import { parseJson, ok } from "@/lib/api";
import { WebhookSchema } from "@/lib/schemas";
import { ingestWebhook } from "@/lib/services/ingestion";

/**
 * Webhook ingress. In mock mode the signature check accepts fixtures; with a
 * RAZORPAY_WEBHOOK_SECRET configured it verifies the x-razorpay-signature.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  let body: unknown;
  try {
    body = JSON.parse(rawBody || "{}");
  } catch {
    return ok({ status: "invalid_signature", reason: "bad_json" }, { status: 400 });
  }
  const parsed = WebhookSchema.safeParse(body);
  if (!parsed.success) {
    return ok({ error: "Invalid webhook", issues: parsed.error.issues }, { status: 400 });
  }

  const { type, payload } = parsed.data;
  const idempotencyKey =
    parsed.data.idempotencyKey ??
    request.headers.get("x-razorpay-event-id") ??
    `wh_${type}_${JSON.stringify(payload.id ?? "")}_${Date.now()}`;

  const result = await ingestWebhook({
    type,
    idempotencyKey,
    orderIndex: parsed.data.orderIndex ?? 0,
    payload,
    rawBody,
    signature: request.headers.get("x-razorpay-signature") ?? undefined,
  });

  return ok(result, {
    status: result.status === "invalid_signature" ? 401 : 200,
  });
}
