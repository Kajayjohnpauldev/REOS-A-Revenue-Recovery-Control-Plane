import type {
  ActionOutcome,
  EntityState,
  EntityType,
  RazorpayAdapter,
} from "./adapter";

/**
 * RealRazorpay — thin REST stub, gated by env (PAYMENTS_PROVIDER=razorpay with
 * a key id/secret). Never used in the default mock build. State reads do a
 * best-effort GET against the Razorpay API; write actions are intentionally
 * left unimplemented so nothing can move real money by accident.
 *
 * // TODO(revivalos): finish action endpoints + response mapping before any
 * // production use.
 */
export class RealRazorpay implements RazorpayAdapter {
  readonly name = "razorpay";
  private readonly auth: string;
  private readonly baseUrl = "https://api.razorpay.com/v1";

  constructor(keyId: string, keySecret: string) {
    this.auth =
      "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  }

  private path(entityType: EntityType, id: string): string {
    const seg: Record<EntityType, string> = {
      payment: "payments",
      order: "orders",
      subscription: "subscriptions",
      invoice: "invoices",
      dispute: "disputes",
    };
    return `${this.baseUrl}/${seg[entityType]}/${id}`;
  }

  async getEntityState(
    entityType: EntityType,
    id: string,
  ): Promise<EntityState> {
    const res = await fetch(this.path(entityType, id), {
      headers: { Authorization: this.auth },
    });
    if (!res.ok) {
      return { entityType, id, status: "unknown", found: false };
    }
    const raw = (await res.json()) as Record<string, unknown>;
    return {
      entityType,
      id,
      status: String(raw.status ?? "unknown"),
      amount: typeof raw.amount === "number" ? raw.amount : undefined,
      found: true,
      raw,
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

  private notImplemented(action: string, id: string): ActionOutcome {
    return {
      ok: false,
      action,
      entityId: id,
      note: "Real Razorpay actions are not implemented in this build.",
      dryRun: true,
    };
  }
  async retryCharge(id: string) {
    return this.notImplemented("retryCharge", id);
  }
  async sendPaymentLink(id: string) {
    return this.notImplemented("sendPaymentLink", id);
  }
  async cancelSubscription(id: string) {
    return this.notImplemented("cancelSubscription", id);
  }
  async submitDisputeEvidence(id: string) {
    return this.notImplemented("submitDisputeEvidence", id);
  }
}
