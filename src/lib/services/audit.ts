import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * audit.ts — assemble a full, ordered case timeline and produce exportable
 * JSON/CSV. The audit trail is a first-class deliverable: original event ->
 * state changes -> reconcile -> classification -> action(s) -> outcome.
 */

export const caseInclude = {
  events: { orderBy: { orderIndex: "asc" } },
  toolCalls: { orderBy: { createdAt: "asc" } },
  messages: { orderBy: { createdAt: "asc" } },
  humanDecisions: { orderBy: { createdAt: "asc" } },
  ledgerEntries: { orderBy: { createdAt: "asc" } },
  holdout: true,
} satisfies Prisma.CaseInclude;

export type CaseWithRelations = Prisma.CaseGetPayload<{
  include: typeof caseInclude;
}>;

export type TimelineItem = {
  ts: string;
  kind: "event" | "tool_call" | "message" | "decision" | "ledger";
  title: string;
  detail: string;
};

export function buildTimeline(c: CaseWithRelations): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const e of c.events) {
    items.push({
      ts: e.receivedAt.toISOString(),
      kind: "event",
      title: e.type,
      detail: `order #${e.orderIndex} · key ${e.idempotencyKey}`,
    });
  }
  for (const t of c.toolCalls) {
    items.push({
      ts: t.createdAt.toISOString(),
      kind: "tool_call",
      title: `${t.agent} → ${t.tool}`,
      detail: t.allowed ? "allowed" : "BLOCKED by guardrail",
    });
  }
  for (const m of c.messages) {
    items.push({
      ts: m.createdAt.toISOString(),
      kind: "message",
      title: `${m.channel} message (${m.status})`,
      detail: `consent ${m.consentChecked ? "ok" : "missing"}, dark-pattern ${
        m.darkPatternPassed ? "passed" : "REJECTED"
      }`,
    });
  }
  for (const d of c.humanDecisions) {
    items.push({
      ts: d.createdAt.toISOString(),
      kind: "decision",
      title: `human: ${d.decision}`,
      detail: d.note ?? "",
    });
  }
  for (const l of c.ledgerEntries) {
    items.push({
      ts: l.createdAt.toISOString(),
      kind: "ledger",
      title: `${l.type} ${l.amount >= 0 ? "+" : ""}${l.amount}`,
      detail: l.note,
    });
  }
  return items.sort((a, b) => a.ts.localeCompare(b.ts));
}

/** A case has a complete trail if it has an event, a reasonCode, and — when it
 *  moved money — at least one ledger entry. Used by the auditCompleteness metric. */
export function hasCompleteTrail(c: CaseWithRelations): boolean {
  const hasEvent = c.events.length > 0;
  const hasReason = !!c.reasonCode;
  const movedMoney = c.recoveryAttribution > 0 || c.actionResult === "recovered";
  const hasLedger = c.ledgerEntries.length > 0;
  return hasEvent && hasReason && (!movedMoney || hasLedger);
}

export async function loadCase(id: string): Promise<CaseWithRelations | null> {
  return prisma.case.findUnique({ where: { id }, include: caseInclude });
}

export async function exportCasesJson(): Promise<CaseWithRelations[]> {
  return prisma.case.findMany({
    include: caseInclude,
    orderBy: { createdAt: "asc" },
  });
}

const CSV_COLUMNS = [
  "id",
  "lane",
  "entityType",
  "entityId",
  "amount",
  "currency",
  "currentState",
  "failureClass",
  "approvalState",
  "reasonCode",
  "confidence",
  "consentState",
  "recoveryAttribution",
  "reversalStatus",
  "policyVersion",
  "createdAt",
  "dueAt",
] as const;

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportCasesCsv(): Promise<string> {
  const cases = await prisma.case.findMany({ orderBy: { createdAt: "asc" } });
  const header = CSV_COLUMNS.join(",");
  const rows = cases.map((c) =>
    CSV_COLUMNS.map((col) => csvCell((c as Record<string, unknown>)[col])).join(","),
  );
  return [header, ...rows].join("\n");
}
