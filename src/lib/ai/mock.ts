import type {
  AIProvider,
  ClassifyInput,
  ClassifyOutput,
  DraftMessageInput,
  DraftMessageOutput,
  ExtractReplyInput,
  ExtractReplyOutput,
  ReplyIntent,
} from "./provider";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/**
 * Deterministic, offline AI provider. Same input -> same output, every time,
 * so replays and tests are reproducible. Pure rules; no network.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async classify(input: ClassifyInput): Promise<ClassifyOutput> {
    const hay = `${input.status} ${input.errorCode ?? ""} ${
      input.errorDescription ?? ""
    }`.toLowerCase();

    let failureClass: string;
    let reasonCode: string;
    let confidence: number;

    if (input.lane === "dispute_refund") {
      failureClass = "dispute";
      reasonCode = "dispute_evidence_required";
      confidence = 0.5;
    } else if (input.lane === "overdue_receivable") {
      failureClass = "overdue";
      reasonCode = "reminder_eligible";
      confidence = 0.6;
    } else if (hay.includes("insufficient")) {
      failureClass = "insufficient_funds";
      reasonCode = "retryable_with_customer_action";
      confidence = 0.66;
    } else if (hay.includes("expired")) {
      failureClass = "expired_card";
      reasonCode = "requires_updated_instrument";
      confidence = 0.7;
    } else if (hay.includes("declined") || hay.includes("bad_request")) {
      failureClass = "card_declined";
      reasonCode = "issuer_declined";
      confidence = 0.55;
    } else if (input.amount > 0 && input.amount < 1000) {
      failureClass = "low_value_retry";
      reasonCode = "auto_retry_candidate";
      confidence = 0.72;
    } else if (hay.includes("gateway") || hay.includes("network")) {
      failureClass = "network_error";
      reasonCode = "transient_retry";
      confidence = 0.6;
    } else {
      // Unknown signal -> abstain and let the caller escalate.
      return {
        failureClass: "unknown",
        reasonCode: "insufficient_signal",
        confidence: 0.2,
        abstained: true,
      };
    }

    // Repeated attempts erode confidence in a purely automated recovery.
    if (input.attemptCount >= 2) confidence = Math.max(0.35, confidence - 0.15);

    return { failureClass, reasonCode, confidence, abstained: false };
  }

  async draftMessage(input: DraftMessageInput): Promise<DraftMessageOutput> {
    const who = input.customerName ? `Hi ${input.customerName},` : "Hi there,";
    const amt = inr(input.amount);

    // On-brand, plain, NON-manipulative copy. No false urgency, no scarcity,
    // no guilt. Always includes an easy, pressure-free next step.
    let subject: string;
    let body: string;
    switch (input.lane) {
      case "payment_failure":
        subject = "A quick heads-up about your recent payment";
        body = `${who}\n\nYour payment of ${amt} didn't go through. No action is needed if you've already sorted it — otherwise, here's a secure link to try again whenever it suits you.\n\nThanks for being a customer.`;
        break;
      case "abandoned_checkout":
        subject = "Your cart is saved";
        body = `${who}\n\nWe saved the ${amt} order you started, so you can pick it up whenever you're ready. No rush at all — the link below will still be here.\n\nHappy to help if you have any questions.`;
        break;
      case "failed_subscription":
        subject = "Update needed for your subscription";
        body = `${who}\n\nWe couldn't process the latest ${amt} charge for your subscription. You can update your payment method with the secure link below — take your time.\n\nThanks for staying with us.`;
        break;
      case "overdue_receivable":
        subject = `A friendly reminder about invoice ${input.entityId}`;
        body = `${who}\n\nThis is a gentle reminder that invoice ${input.entityId} for ${amt} is now past due. If it's already on its way, please ignore this. Otherwise, reply here and we'll be glad to help arrange payment.`;
        break;
      default:
        subject = "A quick note from our team";
        body = `${who}\n\nWe wanted to reach out about a ${amt} item on your account. Reply anytime and we'll help.`;
    }
    return { subject, body };
  }

  async extractReply(input: ExtractReplyInput): Promise<ExtractReplyOutput> {
    const t = input.text.toLowerCase();

    // Promise-to-pay with an optional date.
    if (/\b(pay|paid|send|transfer|settle)\b/.test(t)) {
      const dateMatch = input.text.match(
        /\b(\d{4}-\d{2}-\d{2})\b|\b(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)\b/i,
      );
      return {
        intent: "promise_to_pay",
        promiseToPayDate: dateMatch ? dateMatch[0] : undefined,
        confidence: dateMatch ? 0.8 : 0.6,
        abstained: false,
      };
    }
    if (/\b(dispute|didn't receive|not received|chargeback|wrong|fraud)\b/.test(t)) {
      return {
        intent: "dispute",
        disputeReason: input.text.slice(0, 140),
        confidence: 0.7,
        abstained: false,
      };
    }
    if (/\b(no|won't|refuse|cancel|stop)\b/.test(t)) {
      return { intent: "refuse", confidence: 0.6, abstained: false };
    }
    if (t.includes("?")) {
      return { intent: "question", confidence: 0.55, abstained: false };
    }
    const intent: ReplyIntent = "unknown";
    return { intent, confidence: 0.25, abstained: true };
  }
}
