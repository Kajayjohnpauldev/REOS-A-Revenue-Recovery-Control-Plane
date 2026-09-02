import type {
  Case,
  Message,
  ToolCall,
  LedgerEntry,
  Policy,
} from "@prisma/client";
import type {
  Metrics,
  LaneSummary,
  TrendPoint,
  RecentActivity,
} from "@/lib/services/metrics";
import type { CaseWithRelations, TimelineItem } from "@/lib/services/audit";
import type { Decision } from "@/lib/types";
import type { ReconcileResult } from "@/lib/services/reconcile";
import type { CaseActionResult } from "@/lib/services/caseActions";
import type { ReplayResult } from "@/lib/services/replay";

export type { CaseActionResult, ReplayResult, Decision, TimelineItem };

export type CaseWithHoldout = Case & { holdout: { group: string } | null };
export type CasesResponse = { cases: CaseWithHoldout[]; total: number };

export type MetricsResponse = {
  metrics: Metrics;
  lanes: LaneSummary[];
  trend: TrendPoint[];
  activity: RecentActivity;
};

export type CaseDetailResponse = {
  case: CaseWithRelations;
  timeline: TimelineItem[];
  reconcile: ReconcileResult;
  decision: Decision;
};

export type ApprovalItem = {
  case: Case;
  decision: Decision;
  draftedMessage: Message | null;
};
export type ApprovalsResponse = { items: ApprovalItem[]; total: number };

export type LedgerEntryWithCase = LedgerEntry & {
  case: { lane: string; entityId: string; customerName: string };
};
export type LedgerResponse = {
  entries: LedgerEntryWithCase[];
  totals: { gross: number; refunds: number; net: number; count: number };
};

export type PoliciesResponse = { policies: Policy[]; active: Policy | null };

export type Refusal = {
  id: string;
  kind: "blocked_tool" | "rejected_message";
  agent: string;
  rule: string;
  attempted: string;
  caseId: string;
  lane: string;
  entityId: string;
  customerName: string;
  createdAt: string;
  detail?: string;
};
export type GuardrailAgent = {
  key: string;
  name: string;
  usesAI: boolean;
  abstentionRule: string;
  allowlist: string[];
  allowedCalls: number;
  blockedCalls: number;
};
export type GuardrailsResponse = {
  refusals: Refusal[];
  agents: GuardrailAgent[];
  summary: { blockedTools: number; rejectedMessages: number; total: number };
};

export type AgentToolCall = ToolCall & {
  case: { entityId: string; lane: string };
};
export type AgentInfo = {
  key: string;
  name: string;
  usesAI: boolean;
  job: string;
  abstentionRule: string;
  defaultAllowlist: string[];
  allowlist: string[];
  recent: AgentToolCall[];
  counts: { allowed: number; blocked: number };
};
export type AgentsResponse = { agents: AgentInfo[] };
