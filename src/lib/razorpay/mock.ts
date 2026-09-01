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

const SETTLED_FOR: Record<EntityType, string> = {
  payment: "captured",
  order: "paid",
  subscription: "charged",
  invoice: "paid",
  dispute: "won",
};

/**
 * MockRazorpay — deterministic adapter backed by prisma/fixtures.
 *
 * CRITICAL: the fixtures can return a CURRENT live state that CONTRADICTS an
 * incoming webhook (e.g. a "payment.failed" webhook arrives, but
 * getPaymentState("pay_STALE001") returns "captured"). That contradiction is
 * what makes reconciliation a real no-op instead of a staged demo.
 *
 * An in-memory overlay (`overrides`) lets a successfully-executed action
 * transition an entity to its settled status, so a subsequent re-read reflects
 * the capture — recovery is only ever recorded after that re-read.
 */
export class MockRazorpay implements RazorpayAdapter {
  readonly name = "mock";

  private static overrides = new Map<string, string>();

  /** Reset the overlay to the pristine fixture baseline (used by replay). */
  static resetOverrides(): void {
    MockRazorpay.overrides.clear();
  }

  async getEntityState(
    entityType: EntityType,
    id: string,
  ): Promise<EntityState> {
    const overlay = MockRazorpay.overrides.get(id);
    const f = FIXTURES[id];
    if (!f && overlay === undefined) {
      return { entityType, id, status: "unknown", found: false };
    }
    return {
      entityType: (f?.entityType as EntityType) ?? entityType,
      id,
      status: overlay ?? f!.status,
      amount: f?.amount,
      found: true,
      raw: { ...(f ?? {}), overlay: overlay ?? null },
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

  async markRecovered(entityType: EntityType, entityId: string): Promise<void> {
    MockRazorpay.overrides.set(entityId, SETTLED_FOR[entityType] ?? "captured");
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

/** Reset the mock live-state overlay to the fixture baseline. */
export function resetMockOverrides(): void {
  MockRazorpay.resetOverrides();
}
