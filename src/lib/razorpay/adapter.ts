/**
 * RazorpayAdapter — the seam for reading LIVE entity state and executing bounded
 * actions. reconcile.ts always re-reads live state through this before acting,
 * because a webhook is only a point-in-time snapshot.
 */

export type EntityType =
  | "payment"
  | "order"
  | "subscription"
  | "invoice"
  | "dispute";

export type EntityState = {
  entityType: EntityType;
  id: string;
  /** The CURRENT live status (may contradict an older webhook). */
  status: string;
  amount?: number;
  found: boolean;
  raw?: Record<string, unknown>;
};

export type ActionOutcome = {
  ok: boolean;
  action: string;
  entityId: string;
  resultStatus?: string;
  note: string;
  /** When true, no side effect was performed (default-safe). */
  dryRun: boolean;
};

export type ActionOpts = { dryRun?: boolean };

export interface RazorpayAdapter {
  readonly name: string;
  getPaymentState(id: string): Promise<EntityState>;
  getOrderState(id: string): Promise<EntityState>;
  getSubscriptionState(id: string): Promise<EntityState>;
  getInvoiceState(id: string): Promise<EntityState>;
  getEntityState(entityType: EntityType, id: string): Promise<EntityState>;

  // Bounded, stubbed action methods. dryRun defaults to true (safe).
  retryCharge(id: string, opts?: ActionOpts): Promise<ActionOutcome>;
  sendPaymentLink(id: string, opts?: ActionOpts): Promise<ActionOutcome>;
  cancelSubscription(id: string, opts?: ActionOpts): Promise<ActionOutcome>;
  submitDisputeEvidence(id: string, opts?: ActionOpts): Promise<ActionOutcome>;

  /**
   * Model a successful intervention (mock only): transition the entity to its
   * settled status so a subsequent get*State re-read reflects the capture.
   * Recovery is only ever recorded AFTER re-reading this live state, so the
   * "verified capture" invariant holds. The real adapter omits this — there,
   * capture is confirmed by Razorpay itself.
   */
  markRecovered?(entityType: EntityType, entityId: string): Promise<void>;
}
