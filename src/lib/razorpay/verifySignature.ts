import crypto from "node:crypto";
import { env } from "@/lib/env";

export type SignatureResult = { valid: boolean; reason: string };

/**
 * Verifies a Razorpay webhook signature (HMAC-SHA256 of the raw body with the
 * webhook secret). When no secret is configured we are in MOCK MODE, so fixtures
 * are accepted. This is the real webhook-verify path, gated by env.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string = env.RAZORPAY_WEBHOOK_SECRET,
): SignatureResult {
  if (!secret) {
    return { valid: true, reason: "mock_mode_no_secret" };
  }
  if (!signature) {
    return { valid: false, reason: "missing_signature" };
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { valid, reason: valid ? "verified" : "signature_mismatch" };
}
