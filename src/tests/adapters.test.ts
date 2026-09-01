import { describe, it, expect } from "vitest";
import { MockRazorpay } from "@/lib/razorpay/mock";
import { getRazorpayAdapter } from "@/lib/razorpay";
import { verifyWebhookSignature } from "@/lib/razorpay/verifySignature";
import { MockAIProvider } from "@/lib/ai/mock";
import { getAIProvider } from "@/lib/ai";
import webhooks from "../../prisma/fixtures/webhooks.json";

describe("MockRazorpay — live state can contradict the webhook", () => {
  it("returns 'captured' for pay_STALE001 even though its webhook said 'failed'", async () => {
    // The incoming webhook fixture is a FAILURE...
    const failedWebhook = webhooks.find(
      (w) => w.idempotencyKey === "wh_pf_001",
    );
    expect(failedWebhook?.type).toBe("payment.failed");
    expect(failedWebhook?.payload.status).toBe("failed");

    // ...but the CURRENT live state is captured.
    const rz = new MockRazorpay();
    const live = await rz.getPaymentState("pay_STALE001");
    expect(live.found).toBe(true);
    expect(live.status).toBe("captured");
  });

  it("reports found=false for an unknown entity", async () => {
    const rz = new MockRazorpay();
    const live = await rz.getPaymentState("pay_does_not_exist");
    expect(live.found).toBe(false);
    expect(live.status).toBe("unknown");
  });

  it("action methods are dry-run by default (no side effects)", async () => {
    const rz = new MockRazorpay();
    const out = await rz.retryCharge("pay_LOW014");
    expect(out.dryRun).toBe(true);
    expect(out.note).toMatch(/dry-run/);
  });
});

describe("adapter selection defaults to mock with no env", () => {
  it("getRazorpayAdapter() -> mock", () => {
    expect(getRazorpayAdapter().name).toBe("mock");
  });
  it("getAIProvider() -> mock", () => {
    expect(getAIProvider().name).toBe("mock");
  });
});

describe("MockAIProvider.classify", () => {
  it("classifies an insufficient-funds failure with a confidence", async () => {
    const ai = new MockAIProvider();
    const out = await ai.classify({
      lane: "payment_failure",
      entityType: "payment",
      status: "failed",
      errorDescription: "insufficient funds",
      amount: 12500,
      attemptCount: 1,
    });
    expect(out.failureClass).toBe("insufficient_funds");
    expect(out.abstained).toBe(false);
    expect(out.confidence).toBeGreaterThan(0);
    expect(out.confidence).toBeLessThanOrEqual(1);
  });

  it("abstains on an unrecognisable signal", async () => {
    const ai = new MockAIProvider();
    const out = await ai.classify({
      lane: "payment_failure",
      entityType: "payment",
      status: "weird_unmapped_status",
      amount: 40000,
      attemptCount: 1,
    });
    expect(out.abstained).toBe(true);
    expect(out.confidence).toBeLessThanOrEqual(0.3);
  });
});

describe("verifyWebhookSignature", () => {
  it("accepts fixtures in mock mode (no secret configured)", () => {
    const res = verifyWebhookSignature("{}", undefined, "");
    expect(res.valid).toBe(true);
    expect(res.reason).toBe("mock_mode_no_secret");
  });

  it("rejects a bad signature when a secret is configured", () => {
    const res = verifyWebhookSignature("{}", "deadbeef", "shhh-secret");
    expect(res.valid).toBe(false);
  });
});
