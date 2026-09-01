import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { ingestWebhook } from "@/lib/services/ingestion";
import { executeTool } from "@/lib/services/actions";

// These tests hit the seeded SQLite dev.db and clean up any rows they create.

const createdRawEventKeys: string[] = [];
const createdToolCallIds: string[] = [];

afterAll(async () => {
  if (createdRawEventKeys.length) {
    await prisma.rawEvent.deleteMany({
      where: { idempotencyKey: { in: createdRawEventKeys } },
    });
  }
  if (createdToolCallIds.length) {
    await prisma.toolCall.deleteMany({ where: { id: { in: createdToolCallIds } } });
  }
  await prisma.$disconnect();
});

describe("ingestion — duplicate idempotencyKey is deduped", () => {
  it("accepts once, then dedupes the identical delivery (no second row)", async () => {
    const key = `test-ingest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    createdRawEventKeys.push(key);

    const first = await ingestWebhook({
      type: "payment.failed",
      idempotencyKey: key,
      orderIndex: 0,
      payload: { id: "pay_test", status: "failed", amount: 100 },
    });
    expect(first.status).toBe("accepted");
    expect(first.deduped).toBe(false);

    const second = await ingestWebhook({
      type: "payment.failed",
      idempotencyKey: key,
      orderIndex: 0,
      payload: { id: "pay_test", status: "failed", amount: 100 },
    });
    expect(second.status).toBe("duplicate");
    expect(second.deduped).toBe(true);

    const count = await prisma.rawEvent.count({ where: { idempotencyKey: key } });
    expect(count).toBe(1);
  });

  it("dedupes against an already-seeded event key", async () => {
    const seeded = await prisma.rawEvent.findFirst({ select: { idempotencyKey: true } });
    expect(seeded).not.toBeNull();
    const res = await ingestWebhook({
      type: "payment.failed",
      idempotencyKey: seeded!.idempotencyKey,
      orderIndex: 0,
      payload: { id: "x", status: "failed" },
    });
    expect(res.status).toBe("duplicate");
  });
});

describe("actions — out-of-allowlist tool is refused and logged", () => {
  it("refuses razorpay.retryCharge for the classifier and records allowed=false", async () => {
    const someCase = await prisma.case.findFirst({ select: { id: true } });
    expect(someCase).not.toBeNull();

    const res = await executeTool({
      caseId: someCase!.id,
      agent: "classifier", // allowlist is ["ai.classify"] only
      tool: "razorpay.retryCharge",
      args: { entityId: "pay_x", attemptCount: 0, retryBudget: 3 },
    });
    createdToolCallIds.push(res.toolCallId);

    expect(res.allowed).toBe(false);
    expect(res.executed).toBe(false);
    expect(res.reason).toBe("tool_not_in_allowlist");

    const row = await prisma.toolCall.findUnique({ where: { id: res.toolCallId } });
    expect(row?.allowed).toBe(false);
  });

  it("allows an in-allowlist tool for the right agent (dry-run, no side effect)", async () => {
    const someCase = await prisma.case.findFirst({ select: { id: true } });
    const res = await executeTool({
      caseId: someCase!.id,
      agent: "retry_strategist", // retryCharge IS in its allowlist
      tool: "razorpay.retryCharge",
      args: { entityId: "pay_LOW014", attemptCount: 1, retryBudget: 3 },
    });
    createdToolCallIds.push(res.toolCallId);

    expect(res.allowed).toBe(true);
    expect(res.executed).toBe(false); // dry-run default
  });
});
