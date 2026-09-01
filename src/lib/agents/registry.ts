import { prisma } from "@/lib/db";
import { parseCsv } from "@/lib/types";

/**
 * The seven agents. Three use the LLM; three are pure deterministic code; the
 * orchestrator is read-only glue. Every agent has ONE job, a FIXED default tool
 * allowlist, and an abstention rule (when it can't be sure, it routes to a
 * human). Allowlists can be edited (Step 10) and are persisted in AgentConfig.
 */

export type AgentKey =
  | "orchestrator"
  | "classifier"
  | "communicator"
  | "receivables_reader"
  | "prioritiser"
  | "retry_strategist"
  | "escalation_builder";

export type AgentDef = {
  key: AgentKey;
  name: string;
  usesAI: boolean;
  job: string;
  defaultAllowlist: string[];
  abstentionRule: string;
};

export const AGENTS: AgentDef[] = [
  {
    key: "orchestrator",
    name: "Orchestrator",
    usesAI: false,
    job: "Route each verified case to its lane and playbook. Read-only.",
    defaultAllowlist: [
      "razorpay.getPaymentState",
      "razorpay.getOrderState",
      "razorpay.getSubscriptionState",
      "razorpay.getInvoiceState",
      "razorpay.getEntityState",
    ],
    abstentionRule:
      "Abstain and escalate when the entity, its current state, or consent cannot be determined.",
  },
  {
    key: "classifier",
    name: "Classifier",
    usesAI: true,
    job: "Turn status + error code into a failure class, reason code, and confidence.",
    defaultAllowlist: ["ai.classify"],
    abstentionRule: "Abstain (confidence ≤ 0.3) on an unrecognisable signal; escalate.",
  },
  {
    key: "communicator",
    name: "Communicator",
    usesAI: true,
    job: "Draft a consented, on-brand, non-manipulative message and (only then) send it.",
    defaultAllowlist: ["ai.draftMessage", "razorpay.sendMessage", "razorpay.sendPaymentLink"],
    abstentionRule:
      "Never send without consent or if the dark-pattern screen fails; abstain instead.",
  },
  {
    key: "receivables_reader",
    name: "Receivables Reader",
    usesAI: true,
    job: "Extract reply intent, promise-to-pay date, and dispute reason from a customer reply.",
    defaultAllowlist: ["ai.extractReply"],
    abstentionRule: "Abstain on low-confidence extraction; route to a human.",
  },
  {
    key: "prioritiser",
    name: "Prioritiser",
    usesAI: false,
    job: "Rank open cases by expected net recovery. Pure code.",
    defaultAllowlist: ["policy.score", "db.rankCases"],
    abstentionRule: "N/A — deterministic ranking, no external side effects.",
  },
  {
    key: "retry_strategist",
    name: "Retry Strategist",
    usesAI: false,
    job: "Time retries within the fixed T+3 budget. Cannot exceed the budget. Pure code.",
    defaultAllowlist: ["policy.checkRetryBudget", "razorpay.retryCharge"],
    abstentionRule: "Stop at the retry budget; never schedule a 4th attempt.",
  },
  {
    key: "escalation_builder",
    name: "Escalation Builder",
    usesAI: false,
    job: "Assemble a concise human evidence packet. Pure code.",
    defaultAllowlist: ["escalation.buildPacket"],
    abstentionRule: "N/A — assembles context only; a human decides.",
  },
];

export function getAgentDef(key: string): AgentDef | undefined {
  return AGENTS.find((a) => a.key === key);
}

/** DB override (if any) wins over the registry default. A disabled agent has an
 *  empty allowlist, so every tool is refused. */
export async function resolveAllowlist(agentKey: string): Promise<string[]> {
  const cfg = await prisma.agentConfig.findUnique({ where: { agentKey } });
  if (cfg) return cfg.enabled ? parseCsv(cfg.allowlist) : [];
  return getAgentDef(agentKey)?.defaultAllowlist ?? [];
}

export async function isToolAllowed(
  agentKey: string,
  tool: string,
): Promise<boolean> {
  return (await resolveAllowlist(agentKey)).includes(tool);
}
