# Agents

Seven roles. **Three use the LLM; three are pure deterministic code; the
orchestrator is read-only glue.** Every agent has ONE job, a FIXED tool allowlist,
and an ABSTENTION rule (when it can't be sure, it routes to a human). Every tool
call goes through the bounded action layer (`src/lib/services/actions.ts`), which
enforces the allowlist, dry-run mode, and the retry budget, and logs **every**
attempt as a `ToolCall` (allowed `true`/`false`). Allowlists are editable on
`/agents` and persist in `AgentConfig`.

| Agent | AI? | Job | Default allowlist | Abstains when… |
|---|---|---|---|---|
| **Orchestrator** | No | Route each verified case to its lane + playbook (read-only) | `razorpay.get*State` | entity / state / consent can't be determined → escalate |
| **Classifier** | **AI** | status + error code → failureClass + reasonCode + confidence | `ai.classify` | signal is unrecognisable (confidence ≤ 0.3) → escalate |
| **Communicator** | **AI** | draft a consented, on-brand, non-manipulative message and (only then) send | `ai.draftMessage`, `razorpay.sendMessage`, `razorpay.sendPaymentLink` | no consent **or** dark-pattern screen fails → never send |
| **Receivables Reader** | **AI** | extract reply intent, promise-to-pay date, dispute reason | `ai.extractReply` | extraction confidence is low → escalate |
| **Prioritiser** | No | rank open cases by expected net recovery | `policy.score`, `db.rankCases` | N/A (deterministic, no side effects) |
| **Retry Strategist** | No | time retries within the fixed T+3 budget | `policy.checkRetryBudget`, `razorpay.retryCharge` | at the retry budget — never schedules a 4th attempt |
| **Escalation Builder** | No | assemble a concise human evidence packet | `escalation.buildPacket` | N/A (assembles context; a human decides) |

## Why this split

The **AI agents** do language work — reading messy error strings, writing calm copy,
parsing free-text replies. That is where an LLM adds value and where a mistake is
recoverable (a human reviews, a screen blocks). The **deterministic agents** own
anything that touches money or hard limits — ranking, retry timing, escalation
packaging — because those must be exact, reproducible, and auditable. No AI code
path can move money.

## Guardrails in action

The `Communicator` is the sharp edge:

1. Draft the message with the AI provider.
2. **Dark-pattern screen** — false urgency, confirm-shaming, fake scarcity,
   subscription traps, and shouty/aggressive tone are rejected. A rejected draft is
   stored (`darkPatternPassed: false`) and logged as a blocked tool call.
3. **Consent + channel check** — no consent on file, or a channel outside the
   policy, blocks the send.
4. Only after both gates pass does the send go through the bounded action layer.

Everything a guardrail refuses shows up on `/guardrails` under **"What the agent
refused to do."**
