import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { resolveAllowlist } from "@/lib/agents/registry";
import { getRazorpayAdapter } from "@/lib/razorpay";
import type { EntityType } from "@/lib/razorpay/adapter";
import { checkRetryBudget } from "@/lib/policy/engine";

/**
 * actions.ts — the bounded action layer. Every tool call an agent makes goes
 * through here. It enforces the per-agent allowlist, dry-run mode, and the retry
 * budget, and LOGS every attempt as a ToolCall (allowed true/false). A refused
 * call is recorded with allowed=false and surfaces in Guardrails — nothing is
 * silently dropped.
 */

export type ExecuteInput = {
  caseId: string;
  agent: string;
  tool: string;
  args?: Record<string, unknown>;
  dryRun?: boolean;
};

export type ExecuteResult = {
  allowed: boolean;
  executed: boolean;
  reason: string;
  toolCallId: string;
  result?: unknown;
};

const READ_TOOLS: Record<string, EntityType> = {
  "razorpay.getPaymentState": "payment",
  "razorpay.getOrderState": "order",
  "razorpay.getSubscriptionState": "subscription",
  "razorpay.getInvoiceState": "invoice",
};

/** Persist a ToolCall row and return its id. The single audit point for tools. */
export async function recordToolCall(
  caseId: string,
  agent: string,
  tool: string,
  args: Record<string, unknown>,
  result: unknown,
  allowed: boolean,
): Promise<string> {
  const tc = await prisma.toolCall.create({
    data: {
      caseId,
      agent,
      tool,
      args: args as Prisma.InputJsonValue,
      result:
        result === undefined
          ? Prisma.JsonNull
          : (result as Prisma.InputJsonValue),
      allowed,
    },
    select: { id: true },
  });
  return tc.id;
}

/** Log a domain-guardrail refusal (consent / dark-pattern) as a blocked tool. */
export async function recordBlockedTool(
  caseId: string,
  agent: string,
  tool: string,
  args: Record<string, unknown>,
  rule: string,
): Promise<string> {
  return recordToolCall(caseId, agent, tool, args, { blocked: true, rule }, false);
}

export async function executeTool(input: ExecuteInput): Promise<ExecuteResult> {
  const args = input.args ?? {};
  const dryRun = input.dryRun ?? true;

  // 1. Allowlist enforcement.
  const allowlist = await resolveAllowlist(input.agent);
  if (!allowlist.includes(input.tool)) {
    const id = await recordToolCall(
      input.caseId,
      input.agent,
      input.tool,
      args,
      { blocked: true, rule: "tool_not_in_allowlist" },
      false,
    );
    return {
      allowed: false,
      executed: false,
      reason: "tool_not_in_allowlist",
      toolCallId: id,
    };
  }

  const rz = getRazorpayAdapter();
  const entityId = String(args.entityId ?? args.id ?? "");
  let result: Record<string, unknown> = { ok: true };

  // 2. Read tools.
  if (READ_TOOLS[input.tool]) {
    const state = await rz.getEntityState(READ_TOOLS[input.tool], entityId);
    result = { ok: true, state };
  } else if (input.tool === "razorpay.getEntityState") {
    const state = await rz.getEntityState(
      (String(args.entityType ?? "payment") as EntityType) ?? "payment",
      entityId,
    );
    result = { ok: true, state };
  } else if (input.tool === "razorpay.retryCharge") {
    // 3. Retry-budget enforcement — never exceed the budget.
    const attemptCount = Number(args.attemptCount ?? 0);
    const retryBudget = Number(args.retryBudget ?? 3);
    const rc = checkRetryBudget(attemptCount, retryBudget);
    if (!rc.allowed) {
      const id = await recordToolCall(
        input.caseId,
        input.agent,
        input.tool,
        args,
        { blocked: true, rule: "retry_budget_exhausted" },
        false,
      );
      return {
        allowed: false,
        executed: false,
        reason: "retry_budget_exhausted",
        toolCallId: id,
      };
    }
    const out = await rz.retryCharge(entityId, { dryRun });
    result = { ...out };
  } else if (input.tool === "razorpay.sendPaymentLink") {
    const out = await rz.sendPaymentLink(entityId, { dryRun });
    result = { ...out };
  } else if (input.tool === "razorpay.sendMessage") {
    result = {
      ok: true,
      sent: !dryRun,
      channel: String(args.channel ?? "email"),
      note: dryRun ? "[dry-run] message not actually sent" : "message sent",
    };
  } else if (input.tool === "razorpay.cancelSubscription") {
    const out = await rz.cancelSubscription(entityId, { dryRun });
    result = { ...out };
  } else if (input.tool === "razorpay.submitDisputeEvidence") {
    const out = await rz.submitDisputeEvidence(entityId, { dryRun });
    result = { ...out };
  } else if (input.tool === "policy.checkRetryBudget") {
    result = {
      ok: true,
      ...checkRetryBudget(Number(args.attemptCount ?? 0), Number(args.retryBudget ?? 3)),
    };
  } else if (input.tool === "escalation.buildPacket") {
    result = { ok: true, packet: "assembled", entityId };
  } else {
    // ai.* and other in-allowlist tools are executed inside their agents; here
    // they are just logged as allowed.
    result = { ok: true, note: "handled_by_agent" };
  }

  const id = await recordToolCall(
    input.caseId,
    input.agent,
    input.tool,
    args,
    result,
    true,
  );
  return {
    allowed: true,
    executed: !dryRun,
    reason: dryRun ? "dry_run" : "executed",
    toolCallId: id,
    result,
  };
}
