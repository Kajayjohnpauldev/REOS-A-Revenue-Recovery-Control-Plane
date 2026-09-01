import { env } from "@/lib/env";
import type { RazorpayAdapter } from "./adapter";
import { MockRazorpay } from "./mock";
import { RealRazorpay } from "./real";

export type { RazorpayAdapter, EntityState, ActionOutcome } from "./adapter";

let cached: RazorpayAdapter | null = null;

/**
 * Returns the configured payments adapter. Defaults to MockRazorpay (fixtures)
 * unless PAYMENTS_PROVIDER=razorpay AND a key id/secret are configured.
 */
export function getRazorpayAdapter(): RazorpayAdapter {
  if (cached) return cached;
  cached =
    env.PAYMENTS_PROVIDER === "razorpay" &&
    env.RAZORPAY_KEY_ID &&
    env.RAZORPAY_KEY_SECRET
      ? new RealRazorpay(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET)
      : new MockRazorpay();
  return cached;
}
