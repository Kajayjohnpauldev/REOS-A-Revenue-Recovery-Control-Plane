import { env } from "@/lib/env";

/**
 * Baymax — the in-app AI companion. Uses Google Gemini when a key is configured
 * (Settings → Connect Gemini, or GEMINI_API_KEY in .env), otherwise a built-in
 * offline guide. If a key is present but the call fails, we surface the reason
 * instead of silently pretending to be offline.
 */

const SYSTEM = `You are Baymax, the friendly AI companion inside RevivalOS (ReOS) — a revenue-recovery control plane for Razorpay merchants.
Be warm, calm, and concise (2–5 short sentences). You help people USE the app, but you can also chat naturally.
Key facts:
- Four lanes: payment failures, abandoned checkouts, failed subscriptions, overdue receivables.
- Every at-risk event is RECONCILED against live state before acting; a stale "failed" webhook on an already-paid entity is a logged no-op (no double charge).
- Money changes state ONLY through an append-only ledger; a recovery is recorded only after re-reading a verified capture; refunds append a negative entry so net auto-corrects.
- AI (classify/draft/extract) never moves money. Deterministic code owns money truth.
- Guardrails: the Communicator refuses manipulative copy (dark-pattern screen) and un-consented sends; blocked tool calls are logged.
- Replay studio streams six scripted moments; a treatment-vs-holdout toggle shows incremental recovery.
- Roles: Admin (full + Settings), Recovery Operator (cases/approvals), Finance Analyst (ledger/metrics), Auditor (read-only).
If someone just says "hey" or "how are you", greet them warmly and briefly, then offer to help — do NOT recite the whole feature list.`;

const FALLBACK_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest"];

async function callGemini(
  model: string,
  apiKey: string,
  prompt: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    apiKey,
  )}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 500 },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let reason = `${res.status}`;
    try {
      const j = JSON.parse(body);
      reason = j?.error?.message ? `${res.status}: ${j.error.message}` : reason;
    } catch {
      if (body) reason = `${res.status}: ${body.slice(0, 160)}`;
    }
    throw new Error(reason);
  }
  const data = (await res.json()) as {
    candidates?: {
      content?: { parts?: { text?: string }[] };
      finishReason?: string;
    }[];
    promptFeedback?: { blockReason?: string };
  };
  const cand = data.candidates?.[0];
  const text = cand?.content?.parts?.map((p) => p.text).join("").trim() ?? "";
  if (!text) {
    const why =
      data.promptFeedback?.blockReason ??
      cand?.finishReason ??
      "empty response";
    throw new Error(`no text (${why})`);
  }
  return text;
}

async function askGemini(
  message: string,
  page: string | undefined,
  apiKey: string,
  model: string,
): Promise<string> {
  const prompt = `${SYSTEM}\n\n${
    page && page !== "/" ? `[The user is currently on the ${page.replace("/", "")} screen]\n` : ""
  }User: ${message}`;
  const models = Array.from(new Set([model, ...FALLBACK_MODELS])).filter(Boolean);
  let lastErr = "unknown error";
  for (const m of models) {
    try {
      return await callGemini(m, apiKey, prompt);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(lastErr);
}

/** Quick health check used by Settings → Test connection. */
export async function testGemini(
  apiKey: string,
  model = env.GEMINI_MODEL,
): Promise<{ ok: boolean; model?: string; error?: string }> {
  const models = Array.from(new Set([model, ...FALLBACK_MODELS])).filter(Boolean);
  let lastErr = "unknown error";
  for (const m of models) {
    try {
      await callGemini(m, apiKey, "Reply with exactly: OK");
      return { ok: true, model: m };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  return { ok: false, error: lastErr };
}

const KB: { match: RegExp; answer: string }[] = [
  {
    match: /gemini|api key|connect.*(ai|gemini|key)|add.*key|where.*key|ai ?studio|enable ai|full ai/i,
    answer:
      "To switch me to full Gemini answers: go to Settings → Connect Gemini, grab a free key from Google AI Studio (aistudio.google.com/app/apikey), paste it, and hit Save. Use Test connection to confirm it works. (Only an Admin can do this.)",
  },
  { match: /reconcil|no-?op|double charge|stale|already paid/i, answer: "Before acting, ReOS re-reads the entity's LIVE state. If a 'failed' webhook lands on a payment that's actually captured, it's a logged no-op — no second charge (reason 'already_paid')." },
  { match: /ledger|refund|net|recover(ed|y)/i, answer: "The Ledger is append-only: recoveries add positive entries, refunds add negative ones, so net auto-corrects. Try 'Simulate refund' on the Ledger to watch net drop while gross stays." },
  { match: /guardrail|refus|dark ?pattern|consent|block/i, answer: "Guardrails shows 'What the agent refused to do' — blocked tool calls, manipulative messages caught by the dark-pattern screen, consent failures, and retry-budget stops. Nothing is silently dropped." },
  { match: /replay|moment|holdout|incremental|experiment/i, answer: "Open Replay and press Run Replay to stream six scripted moments. The treatment-vs-holdout toggle recomputes incremental recovery = treatment minus the holdout's natural rate." },
  { match: /polic|retry budget|threshold|version/i, answer: "Policies are the rules you own — retry budget (T+3), amount threshold, consent, auto-approve classes. Saving creates a NEW version, and each case records the version it was decided under." },
  { match: /agent|allowlist|classifier|communicator/i, answer: "Agents shows seven roles — three use the LLM, three are deterministic. Each has a fixed, editable tool allowlist and an abstention rule." },
  { match: /role|login|log ?in|permission|who can/i, answer: "Four roles: Admin (full + Settings), Recovery Operator (cases/approvals), Finance Analyst (ledger/metrics), and Auditor (read-only). Your nav and actions adapt to your role." },
  { match: /approve|approval|case|queue/i, answer: "Work cases from the Cases table or the Approvals queue. Approving records a recovery only after re-reading a verified capture — so the money you see is money you can prove." },
  { match: /metric|chart|export|audit/i, answer: "Metrics shows all ten measures with charts and a one-click audit export (JSON + CSV). 'Incremental' is labelled SIMULATED." },
  { match: /\b(hey|hi|hello|yo|sup|how are|how's it|what's up|wassup|good (morning|evening))\b/i, answer: "Hey! I'm doing great, thanks for asking 😊 I'm Baymax, here to help you get around ReOS. What would you like to do — work cases, check recovery, or something else?" },
];

function offlineAnswer(message: string, page?: string): string {
  const hit = KB.find((k) => k.match.test(message));
  if (hit) return hit.answer;
  const where = page && page !== "/" ? ` You're on ${page.replace("/", "")}.` : "";
  return `Hi, I'm Baymax — your ReOS companion.${where} Ask me about reconciliation, the ledger, guardrails, replay, policies, agents, roles, or metrics. Want full AI answers? An Admin can connect Google Gemini in Settings.`;
}

export async function askAssistant(
  message: string,
  page?: string,
  opts?: { apiKey?: string; model?: string },
): Promise<{ answer: string; source: "gemini" | "offline" | "error" }> {
  const apiKey = opts?.apiKey || env.GEMINI_API_KEY;
  const model = opts?.model || env.GEMINI_MODEL;
  if (apiKey) {
    try {
      return { answer: await askGemini(message, page, apiKey, model), source: "gemini" };
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      return {
        answer: `I'm connected but couldn't reach Gemini right now (${reason}). You can re-check the key with "Test connection" in Settings → Connect Gemini. Meanwhile: ${offlineAnswer(message, page)}`,
        source: "error",
      };
    }
  }
  return { answer: offlineAnswer(message, page), source: "offline" };
}
