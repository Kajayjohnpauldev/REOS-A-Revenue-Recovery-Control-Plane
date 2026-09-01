import { describe, it, expect } from "vitest";
import { reconcile } from "@/lib/services/reconcile";
import { scoreCase } from "@/lib/services/decision";
import { sumTotals } from "@/lib/services/ledger";
import { computeIncremental } from "@/lib/services/metrics";
import { checkRetryBudget } from "@/lib/policy/engine";
import { screenMessage } from "@/lib/agents/darkPatternScreen";
import type { CaseLike, PolicyLike } from "@/lib/types";

const policy: PolicyLike = {
  version: 1,
  retryBudget: 3,
  amountThreshold: 50_000,
  dueAgeDays: 7,
  allowedChannels: "email,sms",
  maxDiscountPct: 10,
  autoApproveClasses: "low_value_retry",
  consentRequired: true,
};

describe("reconcile — the double-charge firewall", () => {
  it("returns a NO-OP for a stale 'failed' webhook on a now-'captured' payment", async () => {
    const r = await reconcile({
      entityType: "payment",
      entityId: "pay_STALE001",
      webhookStatus: "failed",
    });
    expect(r.noop).toBe(true);
    expect(r.reasonCode).toBe("already_paid");
    expect(r.liveStatus).toBe("captured");
  });

  it("proceeds when the entity is still genuinely failed", async () => {
    const r = await reconcile({
      entityType: "payment",
      entityId: "pay_INS022",
      webhookStatus: "failed",
    });
    expect(r.noop).toBe(false);
    expect(r.reasonCode).toBe("proceed");
  });
});

describe("decision — scoring emits a reasonCode and a confidence", () => {
  it("scores an insufficient-funds failure", () => {
    const c: CaseLike = {
      lane: "payment_failure",
      entityType: "payment",
      entityId: "pay_1",
      amount: 12_500,
      currentState: "failed",
      failureClass: "insufficient_funds",
      attemptCount: 1,
      consentState: "granted",
    };
    const d = scoreCase(c, policy);
    expect(d.reasonCode).toBeTruthy();
    expect(d.confidence).toBeGreaterThan(0);
    expect(d.confidence).toBeLessThanOrEqual(1);
    expect(typeof d.expectedNetRecovery).toBe("number");
    expect(d.policyVersion).toBe(1);
  });

  it("escalates a high-value case above the amount threshold", () => {
    const c: CaseLike = {
      lane: "overdue_receivable",
      entityType: "invoice",
      entityId: "inv_1",
      amount: 74_999,
      currentState: "overdue",
      failureClass: "overdue",
      attemptCount: 0,
      consentState: "granted",
      dueAt: new Date(Date.now() - 20 * 86_400_000),
    };
    const d = scoreCase(c, policy);
    expect(d.escalate).toBe(true);
    expect(d.reasonCode).toBe("high_value_escalation");
  });
});

describe("ledger — a refund is excluded from net recovered", () => {
  it("net excludes the negative refund entry", () => {
    const t = sumTotals([{ amount: 1000 }, { amount: 500 }, { amount: -300 }]);
    expect(t.gross).toBe(1500);
    expect(t.refunds).toBe(300);
    expect(t.net).toBe(1200);
  });
});

describe("policy — subscription stops at the retry budget", () => {
  it("blocks a 4th attempt once attemptCount reaches the budget of 3", () => {
    const at3 = checkRetryBudget(3, 3);
    expect(at3.allowed).toBe(false);
    expect(at3.reason).toBe("retry_budget_exhausted");

    const at1 = checkRetryBudget(1, 3);
    expect(at1.allowed).toBe(true);
    expect(at1.remaining).toBe(2);
  });
});

describe("metrics — incremental = treatment minus matched holdout", () => {
  it("computes treatment recovered minus holdout-rate baseline", () => {
    // holdout recovers 20/100 = 20% -> treatment baseline = 100 * 0.2 = 20.
    const inc = computeIncremental({
      treatmentRecoveredValue: 60,
      treatmentTotalValue: 100,
      holdoutRecoveredValue: 20,
      holdoutTotalValue: 100,
    });
    expect(inc).toBe(40);
  });
});

describe("darkPatternScreen — manipulative copy is rejected", () => {
  it("rejects false-urgency, shaming, shouting copy", () => {
    const bad = screenMessage(
      "URGENT!! Respond in 1 HOUR or lose your money forever!!!",
    );
    expect(bad.passed).toBe(false);
    expect(bad.hits.length).toBeGreaterThan(0);
  });

  it("passes calm, honest copy", () => {
    const good = screenMessage(
      "Hi there, your cart is saved. You can finish checking out whenever it suits you.",
    );
    expect(good.passed).toBe(true);
    expect(good.reason).toBe("clean");
  });
});
