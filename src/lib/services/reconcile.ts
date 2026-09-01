import { getRazorpayAdapter } from "@/lib/razorpay";
import type { EntityType } from "@/lib/razorpay/adapter";
import { SETTLED_STATUSES } from "@/lib/types";

/**
 * reconcile.ts — the double-charge firewall.
 *
 * A webhook is only a point-in-time snapshot. Razorpay can send `payment.failed`
 * and then `payment.captured` for the same transaction (late authorization / UPI
 * retry). So BEFORE proposing any action we re-read the CURRENT live state. If
 * the entity is already settled while the webhook said it failed, we return a
 * NO-OP (reasonCode "already_paid") and take no action — preventing a second
 * charge or a needless customer message.
 */

export type ReconcileResult = {
  entityType: string;
  entityId: string;
  webhookStatus: string;
  liveStatus: string;
  liveFound: boolean;
  noop: boolean;
  reasonCode: string;
  note: string;
};

export async function reconcile(input: {
  entityType: string;
  entityId: string;
  webhookStatus: string;
}): Promise<ReconcileResult> {
  const rz = getRazorpayAdapter();
  const live = await rz.getEntityState(
    input.entityType as EntityType,
    input.entityId,
  );

  const liveSettled = SETTLED_STATUSES.includes(live.status);
  const webhookSettled = SETTLED_STATUSES.includes(input.webhookStatus);

  const base = {
    entityType: input.entityType,
    entityId: input.entityId,
    webhookStatus: input.webhookStatus,
    liveStatus: live.status,
    liveFound: live.found,
  };

  if (liveSettled) {
    return {
      ...base,
      noop: true,
      reasonCode: webhookSettled ? "already_settled" : "already_paid",
      note: webhookSettled
        ? `Live state '${live.status}' is settled — nothing to recover.`
        : `Stale '${input.webhookStatus}' webhook; live state is '${live.status}'. No action taken (already paid).`,
    };
  }

  if (!live.found) {
    return {
      ...base,
      noop: false,
      reasonCode: "live_state_unavailable",
      note: "Could not read live state; caller should abstain/escalate rather than act blindly.",
    };
  }

  return {
    ...base,
    noop: false,
    reasonCode: "proceed",
    note: `Live state '${live.status}' confirms the case is still open.`,
  };
}
