/**
 * RevivalOS seed — a realistic demo baseline.
 *
 * Money amounts are WHOLE INR RUPEES (see schema.prisma).
 *
 * Seeds: 1 merchant, 1 operator, 1 policy (v1), and 15 cases spread across all
 * five lanes. Includes every scenario the later steps demo:
 *   - a payment_failure now "paid"        -> stale-failed-but-paid NO-OP
 *   - a failed_subscription at retryBudget -> stop-rule
 *   - a high-value overdue_receivable      -> escalation (> amountThreshold)
 *   - an abandoned_checkout consent granted-> recoverable via message
 *   - a dispute_refund case
 *   - several already-recovered cases (positive ledger entries) so totals != 0
 *
 * Duplicate idempotencyKey / out-of-order arrival are exercised by the ingestion
 * service + replay fixtures (Step 3). The DB's @unique(idempotencyKey) is itself
 * the dedupe guarantee, so a literal duplicate row cannot be seeded; one case
 * below carries an out-of-order arrival pair (orderIndex vs receivedAt disagree).
 */
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const NOW = new Date("2026-09-01T09:00:00.000Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

type EventSpec = {
  type: string;
  orderIndex: number;
  receivedAt: Date;
  payload: Prisma.InputJsonValue;
};
type MessageSpec = {
  channel: string;
  status: string;
  body: string;
  consentChecked: boolean;
  darkPatternPassed: boolean;
  createdAt?: Date;
};
type ToolCallSpec = {
  agent: string;
  tool: string;
  args: Prisma.InputJsonValue;
  result?: Prisma.InputJsonValue;
  allowed: boolean;
  createdAt?: Date;
};
type LedgerSpec = {
  type: string;
  amount: number;
  note: string;
  createdAt?: Date;
};
type DecisionSpec = {
  decision: string;
  note?: string;
  createdAt?: Date;
};

type CaseSpec = {
  key: string;
  lane: string;
  entityType: string;
  entityId: string;
  amount: number;
  createdAt: Date;
  dueAt?: Date;
  currentState: string;
  failureClass?: string;
  attemptCount?: number;
  consentState?: string;
  proposedAction?: string;
  approvalState?: string;
  actionResult?: string;
  recoveryAttribution?: number;
  reversalStatus?: string;
  reasonCode?: string;
  confidence?: number;
  holdout: "treatment" | "holdout";
  events: EventSpec[];
  messages?: MessageSpec[];
  toolCalls?: ToolCallSpec[];
  ledger?: LedgerSpec[];
  decisions?: DecisionSpec[];
};

async function main() {
  console.log("Resetting existing data...");
  await prisma.ledgerEntry.deleteMany();
  await prisma.humanDecision.deleteMany();
  await prisma.message.deleteMany();
  await prisma.toolCall.deleteMany();
  await prisma.rawEvent.deleteMany();
  await prisma.holdoutAssignment.deleteMany();
  await prisma.case.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.user.deleteMany();
  await prisma.merchant.deleteMany();

  const merchant = await prisma.merchant.create({
    data: { name: "Lumina Commerce", environment: "test" },
  });
  const user = await prisma.user.create({
    data: { name: "Aarav Mehta", email: "ops@lumina.example", role: "operator" },
  });
  const policy = await prisma.policy.create({
    data: {
      merchantId: merchant.id,
      version: 1,
      retryBudget: 3,
      amountThreshold: 50_000,
      dueAgeDays: 7,
      allowedChannels: "email,sms",
      maxDiscountPct: 10,
      autoApproveClasses: "low_value_retry",
      consentRequired: true,
    },
  });

  const cases: CaseSpec[] = [
    // ─────────────────────────── payment_failure ───────────────────────────
    {
      key: "pf-stale-paid",
      lane: "payment_failure",
      entityType: "payment",
      entityId: "pay_STALE001",
      amount: 4999,
      createdAt: daysAgo(2),
      currentState: "paid", // live state contradicts the "failed" webhook
      failureClass: "network_error",
      attemptCount: 1,
      consentState: "granted",
      proposedAction: "noop",
      approvalState: "none",
      actionResult: "noop_already_paid",
      reasonCode: "already_paid",
      confidence: 0.99,
      holdout: "treatment",
      events: [
        {
          type: "payment.failed",
          orderIndex: 0,
          receivedAt: hoursAgo(40),
          payload: {
            entity: "payment",
            id: "pay_STALE001",
            status: "failed",
            amount: 4999,
            error_code: "BAD_REQUEST_ERROR",
          },
        },
        {
          type: "payment.captured",
          orderIndex: 1,
          receivedAt: hoursAgo(39),
          payload: {
            entity: "payment",
            id: "pay_STALE001",
            status: "captured",
            amount: 4999,
          },
        },
      ],
      toolCalls: [
        {
          agent: "orchestrator",
          tool: "razorpay.getPaymentState",
          args: { id: "pay_STALE001" },
          result: { status: "captured" },
          allowed: true,
          createdAt: hoursAgo(38),
        },
      ],
    },
    {
      key: "pf-low-recovered",
      lane: "payment_failure",
      entityType: "payment",
      entityId: "pay_LOW014",
      amount: 899,
      createdAt: daysAgo(9),
      currentState: "paid",
      failureClass: "low_value_retry",
      attemptCount: 1,
      consentState: "granted",
      proposedAction: "retry_charge",
      approvalState: "auto_approved",
      actionResult: "recovered",
      recoveryAttribution: 899,
      reasonCode: "auto_retry_success",
      confidence: 0.72,
      holdout: "treatment",
      events: [
        {
          type: "payment.failed",
          orderIndex: 0,
          receivedAt: daysAgo(9),
          payload: { entity: "payment", id: "pay_LOW014", status: "failed", amount: 899 },
        },
        {
          type: "payment.captured",
          orderIndex: 1,
          receivedAt: daysAgo(8),
          payload: { entity: "payment", id: "pay_LOW014", status: "captured", amount: 899 },
        },
      ],
      toolCalls: [
        {
          agent: "retry_strategist",
          tool: "razorpay.retryCharge",
          args: { id: "pay_LOW014", attempt: 2 },
          result: { status: "captured" },
          allowed: true,
          createdAt: daysAgo(8),
        },
      ],
      ledger: [{ type: "recovery", amount: 899, note: "Auto-retry captured", createdAt: daysAgo(8) }],
    },
    {
      key: "pf-insufficient",
      lane: "payment_failure",
      entityType: "payment",
      entityId: "pay_INS022",
      amount: 12500,
      createdAt: daysAgo(1),
      currentState: "failed",
      failureClass: "insufficient_funds",
      attemptCount: 1,
      consentState: "granted",
      proposedAction: "send_retry_link",
      approvalState: "pending",
      reasonCode: "retryable_with_customer_action",
      confidence: 0.58,
      holdout: "treatment",
      events: [
        {
          type: "payment.failed",
          orderIndex: 0,
          receivedAt: daysAgo(1),
          payload: {
            entity: "payment",
            id: "pay_INS022",
            status: "failed",
            amount: 12500,
            error_code: "GATEWAY_ERROR",
            error_description: "insufficient funds",
          },
        },
      ],
      messages: [
        {
          channel: "email",
          status: "drafted",
          body: "Hi — your payment of ₹12,500 didn't go through (insufficient funds). Here's a secure link to try again whenever you're ready.",
          consentChecked: true,
          darkPatternPassed: true,
        },
      ],
    },
    {
      key: "pf-highvalue-escalate",
      lane: "payment_failure",
      entityType: "payment",
      entityId: "pay_HV031",
      amount: 68000,
      createdAt: daysAgo(3),
      currentState: "failed",
      failureClass: "card_declined",
      attemptCount: 2,
      consentState: "granted",
      proposedAction: "escalate_to_human",
      approvalState: "escalated",
      reasonCode: "high_value_escalation",
      confidence: 0.44,
      holdout: "holdout",
      events: [
        {
          type: "payment.failed",
          orderIndex: 0,
          receivedAt: daysAgo(3),
          payload: {
            entity: "payment",
            id: "pay_HV031",
            status: "failed",
            amount: 68000,
            error_code: "BAD_REQUEST_ERROR",
            error_description: "card declined by issuer",
          },
        },
      ],
      decisions: [
        { decision: "escalate", note: "Above ₹50k threshold — routing to human review.", createdAt: daysAgo(2) },
      ],
    },

    // ────────────────────────── abandoned_checkout ─────────────────────────
    {
      key: "ac-consented",
      lane: "abandoned_checkout",
      entityType: "order",
      entityId: "order_AC101",
      amount: 2999,
      createdAt: hoursAgo(20),
      currentState: "created",
      failureClass: "abandoned",
      consentState: "granted",
      proposedAction: "send_reminder",
      approvalState: "pending",
      reasonCode: "consented_reminder_eligible",
      confidence: 0.63,
      holdout: "treatment",
      events: [
        {
          type: "order.created",
          orderIndex: 0,
          receivedAt: hoursAgo(20),
          payload: { entity: "order", id: "order_AC101", status: "created", amount: 2999 },
        },
      ],
      messages: [
        {
          channel: "email",
          status: "drafted",
          body: "You left a few items behind — your cart is saved. Complete your order whenever it suits you.",
          consentChecked: true,
          darkPatternPassed: true,
        },
      ],
    },
    {
      key: "ac-recovered",
      lane: "abandoned_checkout",
      entityType: "order",
      entityId: "order_AC108",
      amount: 5499,
      createdAt: daysAgo(6),
      currentState: "paid",
      failureClass: "abandoned",
      consentState: "granted",
      proposedAction: "send_reminder",
      approvalState: "approved",
      actionResult: "recovered",
      recoveryAttribution: 5499,
      reasonCode: "reminder_converted",
      confidence: 0.61,
      holdout: "treatment",
      events: [
        {
          type: "order.created",
          orderIndex: 0,
          receivedAt: daysAgo(6),
          payload: { entity: "order", id: "order_AC108", status: "created", amount: 5499 },
        },
        {
          type: "order.paid",
          orderIndex: 1,
          receivedAt: daysAgo(5),
          payload: { entity: "order", id: "order_AC108", status: "paid", amount: 5499 },
        },
      ],
      messages: [
        {
          channel: "email",
          status: "sent",
          body: "Your cart is saved — here's a link to finish checking out.",
          consentChecked: true,
          darkPatternPassed: true,
          createdAt: daysAgo(6),
        },
      ],
      ledger: [{ type: "recovery", amount: 5499, note: "Cart recovered after consented reminder", createdAt: daysAgo(5) }],
      decisions: [{ decision: "approve", note: "On-brand reminder, consent on file.", createdAt: daysAgo(6) }],
    },
    {
      key: "ac-no-consent",
      lane: "abandoned_checkout",
      entityType: "order",
      entityId: "order_AC115",
      amount: 1799,
      createdAt: daysAgo(4),
      currentState: "created",
      failureClass: "abandoned",
      consentState: "denied",
      proposedAction: "noop",
      approvalState: "none",
      reasonCode: "no_consent",
      confidence: 0.9,
      holdout: "holdout",
      events: [
        {
          type: "order.created",
          orderIndex: 0,
          receivedAt: daysAgo(4),
          payload: { entity: "order", id: "order_AC115", status: "created", amount: 1799 },
        },
      ],
      toolCalls: [
        {
          agent: "communicator",
          tool: "razorpay.sendMessage",
          args: { channel: "email", entityId: "order_AC115" },
          result: { blocked: true, rule: "consent_required" },
          allowed: false,
          createdAt: daysAgo(4),
        },
      ],
    },

    // ────────────────────────── failed_subscription ────────────────────────
    {
      key: "sub-stop-budget",
      lane: "failed_subscription",
      entityType: "subscription",
      entityId: "sub_STOP201",
      amount: 499,
      createdAt: daysAgo(3),
      currentState: "pending",
      failureClass: "insufficient_funds",
      attemptCount: 3, // == retryBudget -> halted
      consentState: "granted",
      proposedAction: "halt_and_notify",
      approvalState: "none",
      reasonCode: "retry_budget_exhausted",
      confidence: 0.95,
      holdout: "treatment",
      events: [
        {
          type: "subscription.pending",
          orderIndex: 0,
          receivedAt: daysAgo(3),
          payload: { entity: "subscription", id: "sub_STOP201", status: "pending", attempt: 1 },
        },
        {
          type: "subscription.pending",
          orderIndex: 1,
          receivedAt: daysAgo(2),
          payload: { entity: "subscription", id: "sub_STOP201", status: "pending", attempt: 2 },
        },
        {
          type: "subscription.pending",
          orderIndex: 2,
          receivedAt: daysAgo(1),
          payload: { entity: "subscription", id: "sub_STOP201", status: "pending", attempt: 3 },
        },
      ],
      toolCalls: [
        {
          agent: "retry_strategist",
          tool: "policy.checkRetryBudget",
          args: { attemptCount: 3, retryBudget: 3 },
          result: { allowed: false, reason: "budget_exhausted" },
          allowed: true,
          createdAt: daysAgo(1),
        },
      ],
    },
    {
      key: "sub-retrying",
      lane: "failed_subscription",
      entityType: "subscription",
      entityId: "sub_RTY208",
      amount: 799,
      createdAt: daysAgo(1),
      currentState: "pending",
      failureClass: "expired_card",
      attemptCount: 1,
      consentState: "granted",
      proposedAction: "retry_charge",
      approvalState: "auto_approved",
      reasonCode: "within_retry_budget",
      confidence: 0.55,
      holdout: "treatment",
      events: [
        // Out-of-order arrival: orderIndex 1 arrives BEFORE orderIndex 0.
        // Reconciliation must sort by orderIndex, not receivedAt.
        {
          type: "subscription.pending",
          orderIndex: 1,
          receivedAt: hoursAgo(20),
          payload: { entity: "subscription", id: "sub_RTY208", status: "pending", attempt: 1 },
        },
        {
          type: "subscription.halted",
          orderIndex: 0,
          receivedAt: hoursAgo(22),
          payload: { entity: "subscription", id: "sub_RTY208", status: "note", attempt: 0 },
        },
      ],
    },
    {
      key: "sub-recovered",
      lane: "failed_subscription",
      entityType: "subscription",
      entityId: "sub_OK214",
      amount: 1299,
      createdAt: daysAgo(7),
      currentState: "active",
      failureClass: "insufficient_funds",
      attemptCount: 2,
      consentState: "granted",
      proposedAction: "retry_charge",
      approvalState: "auto_approved",
      actionResult: "recovered",
      recoveryAttribution: 1299,
      reasonCode: "retry_success",
      confidence: 0.6,
      holdout: "holdout",
      events: [
        {
          type: "subscription.pending",
          orderIndex: 0,
          receivedAt: daysAgo(7),
          payload: { entity: "subscription", id: "sub_OK214", status: "pending", attempt: 1 },
        },
        {
          type: "subscription.charged",
          orderIndex: 1,
          receivedAt: daysAgo(6),
          payload: { entity: "subscription", id: "sub_OK214", status: "charged", amount: 1299 },
        },
      ],
      ledger: [{ type: "recovery", amount: 1299, note: "Subscription re-charged (holdout baseline)", createdAt: daysAgo(6) }],
    },

    // ────────────────────────── overdue_receivable ─────────────────────────
    {
      key: "or-highvalue",
      lane: "overdue_receivable",
      entityType: "invoice",
      entityId: "inv_HV301",
      amount: 74999,
      createdAt: daysAgo(30),
      dueAt: daysAgo(22),
      currentState: "overdue",
      failureClass: "overdue",
      consentState: "granted",
      proposedAction: "escalate_to_human",
      approvalState: "pending",
      reasonCode: "high_value_escalation",
      confidence: 0.5,
      holdout: "treatment",
      events: [
        {
          type: "invoice.issued",
          orderIndex: 0,
          receivedAt: daysAgo(30),
          payload: { entity: "invoice", id: "inv_HV301", status: "issued", amount: 74999 },
        },
        {
          type: "invoice.overdue",
          orderIndex: 1,
          receivedAt: daysAgo(22),
          payload: { entity: "invoice", id: "inv_HV301", status: "overdue", amount: 74999 },
        },
      ],
      toolCalls: [
        {
          agent: "escalation_builder",
          tool: "escalation.buildPacket",
          args: { entityId: "inv_HV301", amount: 74999 },
          result: { packet: "attached", ageDays: 22 },
          allowed: true,
          createdAt: daysAgo(2),
        },
      ],
    },
    {
      key: "or-standard",
      lane: "overdue_receivable",
      entityType: "invoice",
      entityId: "inv_STD308",
      amount: 18000,
      createdAt: daysAgo(24),
      dueAt: daysAgo(10),
      currentState: "overdue",
      failureClass: "overdue",
      consentState: "granted",
      proposedAction: "send_invoice_reminder",
      approvalState: "pending",
      reasonCode: "reminder_eligible",
      confidence: 0.57,
      holdout: "holdout",
      events: [
        {
          type: "invoice.overdue",
          orderIndex: 0,
          receivedAt: daysAgo(10),
          payload: { entity: "invoice", id: "inv_STD308", status: "overdue", amount: 18000 },
        },
      ],
      messages: [
        {
          channel: "email",
          status: "drafted",
          body: "A friendly reminder: invoice inv_STD308 (₹18,000) is now past due. Reply if you'd like to arrange payment.",
          consentChecked: true,
          darkPatternPassed: true,
        },
      ],
    },
    {
      key: "or-recovered",
      lane: "overdue_receivable",
      entityType: "invoice",
      entityId: "inv_OK312",
      amount: 22000,
      createdAt: daysAgo(20),
      dueAt: daysAgo(12),
      currentState: "paid",
      failureClass: "overdue",
      consentState: "granted",
      proposedAction: "send_invoice_reminder",
      approvalState: "approved",
      actionResult: "recovered",
      recoveryAttribution: 22000,
      reasonCode: "reminder_converted",
      confidence: 0.6,
      holdout: "treatment",
      events: [
        {
          type: "invoice.overdue",
          orderIndex: 0,
          receivedAt: daysAgo(12),
          payload: { entity: "invoice", id: "inv_OK312", status: "overdue", amount: 22000 },
        },
        {
          type: "invoice.paid",
          orderIndex: 1,
          receivedAt: daysAgo(9),
          payload: { entity: "invoice", id: "inv_OK312", status: "paid", amount: 22000 },
        },
      ],
      ledger: [{ type: "recovery", amount: 22000, note: "Invoice collected after reminder", createdAt: daysAgo(9) }],
      decisions: [{ decision: "approve", note: "Consent on file; standard reminder.", createdAt: daysAgo(11) }],
    },

    // ─────────────────────────── dispute_refund ────────────────────────────
    {
      key: "dr-dispute",
      lane: "dispute_refund",
      entityType: "dispute",
      entityId: "disp_DR401",
      amount: 15000,
      createdAt: daysAgo(5),
      currentState: "disputed",
      failureClass: "dispute",
      consentState: "unknown",
      proposedAction: "submit_evidence",
      approvalState: "pending",
      reversalStatus: "disputed",
      reasonCode: "dispute_evidence_required",
      confidence: 0.4,
      holdout: "holdout",
      events: [
        {
          type: "payment.dispute.created",
          orderIndex: 0,
          receivedAt: daysAgo(5),
          payload: { entity: "dispute", id: "disp_DR401", status: "open", amount: 15000, reason: "product_not_received" },
        },
      ],
      toolCalls: [
        {
          agent: "communicator",
          tool: "razorpay.sendMessage",
          args: { channel: "sms", entityId: "disp_DR401", tone: "urgent" },
          result: { blocked: true, rule: "dark_pattern_false_urgency" },
          allowed: false,
          createdAt: daysAgo(5),
        },
      ],
      messages: [
        {
          channel: "sms",
          status: "rejected",
          body: "URGENT!! Respond in 1 HOUR or lose your money forever!!!",
          consentChecked: false,
          darkPatternPassed: false,
          createdAt: daysAgo(5),
        },
      ],
    },
    {
      key: "dr-recovered",
      lane: "dispute_refund",
      entityType: "payment",
      entityId: "pay_DR408",
      amount: 8999,
      createdAt: daysAgo(11),
      currentState: "paid",
      failureClass: "chargeback_recovered",
      consentState: "granted",
      proposedAction: "submit_evidence",
      approvalState: "approved",
      actionResult: "recovered",
      recoveryAttribution: 8999,
      reversalStatus: "none",
      reasonCode: "dispute_won",
      confidence: 0.65,
      holdout: "treatment",
      events: [
        {
          type: "payment.dispute.created",
          orderIndex: 0,
          receivedAt: daysAgo(11),
          payload: { entity: "dispute", id: "pay_DR408", status: "open", amount: 8999 },
        },
        {
          type: "payment.dispute.won",
          orderIndex: 1,
          receivedAt: daysAgo(9),
          payload: { entity: "dispute", id: "pay_DR408", status: "won", amount: 8999 },
        },
      ],
      ledger: [{ type: "recovery", amount: 8999, note: "Dispute won — funds retained", createdAt: daysAgo(9) }],
      decisions: [{ decision: "approve", note: "Evidence packet accepted by issuer.", createdAt: daysAgo(10) }],
    },
  ];

  let eventCount = 0;
  let holdoutCount = 0;
  for (const c of cases) {
    const events: Prisma.RawEventCreateWithoutCaseInput[] = c.events.map((e) => ({
      type: e.type,
      payload: e.payload,
      idempotencyKey: `${c.key}:${e.type}:${e.orderIndex}`,
      receivedAt: e.receivedAt,
      orderIndex: e.orderIndex,
    }));
    eventCount += events.length;
    if (c.holdout === "holdout") holdoutCount += 1;

    await prisma.case.create({
      data: {
        merchantId: merchant.id,
        lane: c.lane,
        entityType: c.entityType,
        entityId: c.entityId,
        amount: c.amount,
        currency: "INR",
        createdAt: c.createdAt,
        dueAt: c.dueAt ?? null,
        currentState: c.currentState,
        failureClass: c.failureClass ?? null,
        attemptCount: c.attemptCount ?? 0,
        consentState: c.consentState ?? "unknown",
        proposedAction: c.proposedAction ?? null,
        approvalState: c.approvalState ?? "none",
        actionResult: c.actionResult ?? null,
        recoveryAttribution: c.recoveryAttribution ?? 0,
        reversalStatus: c.reversalStatus ?? "none",
        policyVersion: policy.version,
        reasonCode: c.reasonCode ?? null,
        confidence: c.confidence ?? null,
        events: { create: events },
        holdout: { create: { group: c.holdout } },
        messages: c.messages
          ? {
              create: c.messages.map((m) => ({
                channel: m.channel,
                status: m.status,
                body: m.body,
                consentChecked: m.consentChecked,
                darkPatternPassed: m.darkPatternPassed,
                createdAt: m.createdAt ?? c.createdAt,
              })),
            }
          : undefined,
        toolCalls: c.toolCalls
          ? {
              create: c.toolCalls.map((t) => ({
                agent: t.agent,
                tool: t.tool,
                args: t.args,
                result: t.result ?? Prisma.JsonNull,
                allowed: t.allowed,
                createdAt: t.createdAt ?? c.createdAt,
              })),
            }
          : undefined,
        ledgerEntries: c.ledger
          ? {
              create: c.ledger.map((l) => ({
                type: l.type,
                amount: l.amount,
                note: l.note,
                createdAt: l.createdAt ?? c.createdAt,
              })),
            }
          : undefined,
        humanDecisions: c.decisions
          ? {
              create: c.decisions.map((d) => ({
                userId: user.id,
                decision: d.decision,
                note: d.note ?? null,
                createdAt: d.createdAt ?? c.createdAt,
              })),
            }
          : undefined,
      },
    });
  }

  // ─── Summary ───────────────────────────────────────────────────────────
  const [
    merchants,
    users,
    policies,
    caseTotal,
    rawEvents,
    messages,
    toolCalls,
    humanDecisions,
    ledgerEntries,
    holdouts,
  ] = await Promise.all([
    prisma.merchant.count(),
    prisma.user.count(),
    prisma.policy.count(),
    prisma.case.count(),
    prisma.rawEvent.count(),
    prisma.message.count(),
    prisma.toolCall.count(),
    prisma.humanDecision.count(),
    prisma.ledgerEntry.count(),
    prisma.holdoutAssignment.count(),
  ]);

  const perLane = await prisma.case.groupBy({
    by: ["lane"],
    _count: { _all: true },
    _sum: { amount: true },
  });
  const blockedTools = await prisma.toolCall.count({ where: { allowed: false } });
  const rejectedMsgs = await prisma.message.count({ where: { darkPatternPassed: false } });
  const totalsAgg = await prisma.ledgerEntry.aggregate({ _sum: { amount: true } });

  console.log("\n=== Seed complete ===");
  console.table({
    Merchant: merchants,
    User: users,
    Policy: policies,
    Case: caseTotal,
    RawEvent: rawEvents,
    Message: messages,
    ToolCall: toolCalls,
    HumanDecision: humanDecisions,
    LedgerEntry: ledgerEntries,
    HoldoutAssignment: holdouts,
  });
  console.log("\nCases per lane:");
  console.table(
    Object.fromEntries(
      perLane.map((l) => [
        l.lane,
        { count: l._count._all, atRiskOrValue: `₹${(l._sum.amount ?? 0).toLocaleString("en-IN")}` },
      ]),
    ),
  );
  console.log(
    `\nHoldouts: ${holdoutCount}/${caseTotal} (${Math.round((holdoutCount / caseTotal) * 100)}% holdout)`,
  );
  console.log(`Events seeded: ${eventCount}`);
  console.log(`Guardrail signals — blocked tool calls: ${blockedTools}, rejected messages: ${rejectedMsgs}`);
  console.log(`Ledger gross (sum of entries): ₹${(totalsAgg._sum.amount ?? 0).toLocaleString("en-IN")}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
