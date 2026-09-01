import { prisma } from "@/lib/db";
import { getAIProvider } from "@/lib/ai";
import { consentSatisfied, isChannelAllowed } from "@/lib/policy/engine";
import { executeTool, recordBlockedTool } from "@/lib/services/actions";
import type { CaseLike, PolicyLike } from "@/lib/types";
import { screenMessage } from "./darkPatternScreen";

/**
 * Communicator (AI) — drafts a message, then passes it through the dark-pattern
 * screen AND a consent check BEFORE anything is sent. A failure at either gate
 * is refused, recorded as a blocked ToolCall, and (for dark-pattern) stored as a
 * rejected Message — both visible in Guardrails.
 */

export type CommResult = {
  ok: boolean;
  status: "sent" | "drafted" | "blocked";
  reason: string;
  body?: string;
  subject?: string;
  messageId?: string;
  toolCallId?: string;
};

export async function draftAndSend(input: {
  caseId: string;
  c: CaseLike;
  policy: PolicyLike;
  channel?: string;
  send?: boolean;
}): Promise<CommResult> {
  const channel = input.channel ?? "email";
  const ai = getAIProvider();
  const draft = await ai.draftMessage({
    lane: input.c.lane,
    channel,
    amount: input.c.amount,
    entityId: input.c.entityId,
  });

  // Gate 1 — dark-pattern screen.
  const screen = screenMessage(draft.body);
  if (!screen.passed) {
    const msg = await prisma.message.create({
      data: {
        caseId: input.caseId,
        channel,
        status: "rejected",
        body: draft.body,
        consentChecked: false,
        darkPatternPassed: false,
      },
      select: { id: true },
    });
    const toolCallId = await recordBlockedTool(
      input.caseId,
      "communicator",
      "razorpay.sendMessage",
      { channel, entityId: input.c.entityId },
      screen.reason,
    );
    return {
      ok: false,
      status: "blocked",
      reason: screen.reason,
      body: draft.body,
      messageId: msg.id,
      toolCallId,
    };
  }

  // Gate 2 — consent + allowed channel.
  if (!consentSatisfied(input.c.consentState, input.policy) || !isChannelAllowed(channel, input.policy)) {
    const rule = !isChannelAllowed(channel, input.policy)
      ? "channel_not_allowed"
      : "consent_required";
    const toolCallId = await recordBlockedTool(
      input.caseId,
      "communicator",
      "razorpay.sendMessage",
      { channel, entityId: input.c.entityId },
      rule,
    );
    return { ok: false, status: "blocked", reason: rule, body: draft.body, toolCallId };
  }

  // Passed both gates. Send (or leave drafted) through the bounded action layer.
  const doSend = input.send ?? false;
  const exec = await executeTool({
    caseId: input.caseId,
    agent: "communicator",
    tool: "razorpay.sendMessage",
    args: { channel, entityId: input.c.entityId },
    dryRun: !doSend,
  });

  const msg = await prisma.message.create({
    data: {
      caseId: input.caseId,
      channel,
      status: doSend ? "sent" : "drafted",
      body: draft.body,
      consentChecked: true,
      darkPatternPassed: true,
    },
    select: { id: true },
  });

  return {
    ok: true,
    status: doSend ? "sent" : "drafted",
    reason: "clean",
    body: draft.body,
    subject: draft.subject,
    messageId: msg.id,
    toolCallId: exec.toolCallId,
  };
}
