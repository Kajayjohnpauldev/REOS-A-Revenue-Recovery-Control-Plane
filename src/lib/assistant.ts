import { env, hasGemini } from "@/lib/env";

/**
 * "Ask RevivalOS" helper. Uses Google Gemini when GEMINI_API_KEY is set,
 * otherwise a built-in offline knowledge base so the orb always works.
 */

const SYSTEM = `You are the in-app help assistant for RevivalOS — a revenue-recovery control plane for Razorpay merchants.
Answer in 2–5 short sentences, friendly and concrete, about how to USE the app.
Key facts:
- Four surfaces (lanes): payment failures, abandoned checkouts, failed subscriptions, overdue receivables.
- Every at-risk event is RECONCILED against live state before acting; a stale "failed" webhook on an already-paid entity is a logged no-op (no double charge).
- Money changes state ONLY through an append-only ledger; a recovery is recorded only after re-reading a verified capture; refunds append a negative entry so net auto-corrects.
- AI (classify/draft/extract) never moves money. Deterministic code owns money truth.
- Guardrails: the Communicator refuses manipulative copy (dark-pattern screen) and un-consented sends; blocked tool calls are logged. See the Guardrails screen.
- Replay studio streams six scripted moments and has a treatment-vs-holdout toggle for incremental recovery = treatment minus the holdout's natural rate.
- Roles: Admin (full), Recovery Operator (cases/approvals), Finance Analyst (ledger/metrics), Auditor (read-only). Screens are gated by role.
- Screens: Overview, Cases (+ decision log), Approvals, Guardrails, Ledger, Policies (versioned), Agents (editable tool allowlists), Replay, Metrics, Settings.
If a question is unrelated, gently steer back to RevivalOS.`;

async function askGemini(message: string, page?: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: page ? `[The user is on ${page}]\n${message}` : message },
          ],
        },
      ],
      generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  if (!text.trim()) throw new Error("empty");
  return text.trim();
}

const KB: { match: RegExp; answer: string }[] = [
  {
    match: /reconcil|no-?op|double charge|stale|already paid/i,
    answer:
      "Before acting, RevivalOS re-reads the entity's LIVE state. If a 'failed' webhook lands on a payment that's actually captured, it's a logged no-op — no second charge. You'll see this on a case's decision log as reason 'already_paid'.",
  },
  {
    match: /ledger|refund|net|recover(ed|y)/i,
    answer:
      "The Ledger is append-only: recoveries add positive entries, refunds add negative ones, so net auto-corrects and a recovery is never overstated. Try 'Simulate refund' on the Ledger screen to watch net drop while gross stays.",
  },
  {
    match: /guardrail|refus|dark ?pattern|consent|block/i,
    answer:
      "Guardrails shows 'What the agent refused to do' — blocked tool calls, manipulative messages caught by the dark-pattern screen, consent failures, and retry-budget stops. Nothing is silently dropped; every refusal is logged.",
  },
  {
    match: /replay|moment|holdout|incremental|experiment/i,
    answer:
      "Open Replay and press Run Replay to stream six scripted moments through the real pipeline. The treatment-vs-holdout toggle recomputes incremental recovery = treatment minus what treatment would have recovered at the holdout group's natural rate.",
  },
  {
    match: /polic|retry budget|threshold|version/i,
    answer:
      "Policies are the rules you own — retry budget (T+3), amount threshold, consent, auto-approve classes. Saving creates a NEW version (never an overwrite), and each case records the version it was decided under.",
  },
  {
    match: /agent|allowlist|classifier|communicator/i,
    answer:
      "Agents shows seven roles — three use the LLM, three are deterministic. Each has a fixed, editable tool allowlist and an abstention rule. Any tool outside the allowlist is refused and logged.",
  },
  {
    match: /role|login|log ?in|permission|who can/i,
    answer:
      "There are four roles: Admin (full control + Settings), Recovery Operator (cases/approvals/guardrails), Finance Analyst (ledger/metrics), and Auditor (read-only). Your nav and available actions adapt to your role.",
  },
  {
    match: /approve|approval|case|queue/i,
    answer:
      "Work cases from the Cases table or the Approvals queue. Approving executes the action and records a recovery only after re-reading a verified capture — so the money you see is money you can prove.",
  },
  {
    match: /metric|chart|export|audit/i,
    answer:
      "Metrics shows all ten measures with charts and a one-click audit export (JSON + CSV). 'Incremental' is labelled SIMULATED because it comes from the mock experiment.",
  },
];

function offlineAnswer(message: string, page?: string): string {
  const hit = KB.find((k) => k.match.test(message));
  if (hit) return hit.answer;
  const where = page ? ` You're on ${page.replace("/", "")}.` : "";
  return (
    `I'm your RevivalOS guide.${where} Ask me about reconciliation & no-ops, the ledger & refunds, guardrails, the replay studio, policies, agents, roles, or metrics. ` +
    `Tip: add a GEMINI_API_KEY in .env to get full AI answers.`
  );
}

export async function askAssistant(
  message: string,
  page?: string,
): Promise<{ answer: string; source: "gemini" | "offline" }> {
  if (hasGemini) {
    try {
      return { answer: await askGemini(message, page), source: "gemini" };
    } catch {
      // fall through to offline
    }
  }
  return { answer: offlineAnswer(message, page), source: "offline" };
}
