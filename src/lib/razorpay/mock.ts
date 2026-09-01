import type {
  ActionOpts,
  ActionOutcome,
  EntityState,
  EntityType,
  RazorpayAdapter,
} from "./adapter";
import entityStatesJson from "../../../prisma/fixtures/entity-states.json";

type FixtureState = {
  entityType: string;
  status: string;
  amount?: number;
  contradiction?: string;
};

// Strip the leading "_comment" doc key; keep only real entities.
const FIXTURES: Record<string, FixtureState> = Object.fromEntries(
  Object.entries(entityStatesJson as Record<string, unknown>).filter(
    ([k, v]) => k !== "_comment" && typeof v === "object" && v !== null,
  ) as [string, FixtureState][],
);

/**
 * MockRazorpay — deterministic adapter backed by prisma/fixtures.
 *
 * CRITICAL: the fixtures can return a CURRENT live state that CONTRADICTS an
 * incoming webhook. e.g. a "payment.failed" webhook arrives, but
 * getPaymentState("pay_STALE001") returns "captured". That contradiction is
 * what makes reconciliation a real no-op instead of a staged demo.
 */
export class MockRazorpay implements RazorpayAdapter {
  readonly name = "mock";

  async getEntityState(
    entityType: EntityType,
    id: string,
  ): Promise<EntityState> {
    const f = FIXTURES[id];
    if (!f) {
      return { entityType, id, status: "unknown", found: false };
    }
    return {
      entityType: (f.entityType as EntityType) ?? entityType,
      id,
      status: f.status,
      amount: f.amount,
      found: true,
      raw: f as Record<string, unknown>,
    };
  }

  getPaymentState(id: string) {
    return this.getEntityState("payment", id);
  }
  getOrderState(id: string) {
    return this.getEntityState("order", id);
  }
  getSubscriptionState(id: string) {
    return this.getEntityState("subscription", id);
  }
  getInvoiceState(id: string) {
    return this.getEntityState("invoice", id);
  }

  private async runAction(
    action: string,
    id: string,
    opts: ActionOpts | undefined,
    computeResultStatus: (live: EntityState) => string,
    note: string,
  ): Promise<ActionOutcome> {
    const dryRun = opts?.dryRun ?? true;
    const live = await this.getEntityState("payment", id);
    return {
      ok: true,
      action,
      entityId: id,
      resultStatus: computeResultStatus(live),
      note: dryRun ? `[dry-run] ${note}` : note,
      dryRun,
    };
  }

  retryCharge(id: string, opts?: ActionOpts) {
    // If live state already shows success, the retry simply confirms it;
    // otherwise the charge is left pending for the next cycle.
    return this.runAction(
      "retryCharge",
      id,
      opts,
      (live) =>
        ["captured", "paid", "active", "charged"].includes(live.status)
          ? "captured"
          : "pending",
      "Re-attempted the charge on the payment/subscription.",
    );
  }

  sendPaymentLink(id: string, opts?: ActionOpts) {
    return this.runAction(
      "sendPaymentLink",
      id,
      opts,
      (live) => (live.status === "paid" ? "paid" : "link_sent"),
      "Sent a secure payment link to the customer.",
    );
  }

  cancelSubscription(id: string, opts?: ActionOpts) {
    return this.runAction(
      "cancelSubscription",
      id,
      opts,
      () => "halted",
      "Halted the subscription after the retry budget was exhausted.",
    );
  }

  submitDisputeEvidence(id: string, opts?: ActionOpts) {
    return this.runAction(
      "submitDisputeEvidence",
      id,
      opts,
      () => "under_review",
      "Submitted the evidence packet for the dispute.",
    );
  }
}
