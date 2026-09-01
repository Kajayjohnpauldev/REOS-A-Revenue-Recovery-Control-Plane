# RevivalOS

**A Revenue Recovery Control Plane for Razorpay merchants.**

> **Thesis:** Given a _verified_ revenue-risk event, recover the most money with the
> least customer friction — and prove exactly what happened, why, and when we chose
> to stop.

RevivalOS detects at-risk revenue across four surfaces — **payment failures,
abandoned checkouts, failed subscriptions, and overdue receivables** — reconciles
each against **live** Razorpay state, chooses **one** bounded intervention inside a
policy the merchant owns, and proves the exact money recovered, subtracting refunds
and disputes back out. It is a desktop operations console (think Linear / Stripe
Dashboard / Retool), not a chatbot.

It runs **fully in mock mode with zero external keys.**

---

## Who benefits (kept honest)

- **The merchant** gets the recovered revenue directly, plus eliminated
  double-charge risk (reconciliation), eliminated manipulative-messaging risk
  (dark-pattern screen), a complete audit trail, and a policy they control.
- **Razorpay's benefit is indirect and is a stated _hypothesis_:** if merchants
  convert more attempts into captures and collect more invoices, the platform grows
  stickier via conversion, retention, and differentiation. RevivalOS measures
  merchant recovery and platform value **separately** and never conflates them.

---

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind v4 + shadcn/ui · TanStack
Table v8 · Recharts · React Query + Zustand · Zod · Prisma + SQLite · Vitest.

- **AI seam** — `src/lib/ai` with a deterministic `MockProvider` (default) and an
  OpenAI-compatible driver (`AI_PROVIDER=openai`).
- **Payments seam** — `src/lib/razorpay` with a fixtures-backed `MockRazorpay`
  (default) and a REST stub (`PAYMENTS_PROVIDER=razorpay`).

---

## Quickstart

```bash
npm install
npm run seed      # migrates + seeds 15 realistic cases across all 5 lanes
npm run dev       # http://localhost:3000
```

No API keys required — mock mode is the default. Other scripts:

```bash
npm run test      # Vitest — the credibility core (reconcile, dedupe, ledger, policy…)
npm run demo      # runs the pipeline from the CLI and prints gross / incremental / net
npm run build     # production build
npm run db:reset  # reset + reseed a pristine baseline
```

---

## The 5-minute demo — Replay & Experiment Studio (`/replay`)

Press **Run Replay** and watch six scripted moments stream through the _same_
services production uses:

1. **Stale failure webhook** → a `payment.failed` webhook arrives, but re-reading
   live state shows the payment is already **captured** → intelligent **no-op**
   (logged, no double charge).
2. **Duplicate & out-of-order** → a duplicate `idempotencyKey` is **deduped** and an
   out-of-order pair is ordered by `orderIndex` → a second charge is **blocked**,
   not silently dropped.
3. **Consented cart recovery** → consent is on file, a calm reminder is sent, the
   customer pays, and we attribute the recovery only after verifying the paid order.
4. **Retry budget reached** → a subscription failed all 3 daily retries (T+3) → the
   policy stop rule **halts** it instead of trying a 4th time.
5. **High-value escalation** → a receivable above the amount threshold is **routed
   to a human** rather than auto-actioned.
6. **Refund auto-subtracts** → a previously recovered payment is refunded; the
   append-only ledger adds a **negative** entry and **net auto-corrects**.

A **treatment-vs-holdout toggle** recomputes _incremental_ recovery live
(treatment − matched holdout). `/metrics` shows all ten measures with a one-click
audit export (JSON + CSV).

---

## What the agent refused to do (`/guardrails`)

Safety is a visible feature. The Guardrails cockpit surfaces every refusal as a
card — the attempted action, why it was blocked, and the exact rule:

- **Consent** — a message send with no consent on file is blocked
  (`consent_required`).
- **Dark patterns** — manipulative copy (false urgency, shaming, shouting) is
  rejected by the dark-pattern screen and never sent.
- **Allowlist** — a tool outside an agent's allowlist is refused and logged
  (`allowed: false`).
- **Retry budget** — a 4th retry beyond the T+3 budget is stopped.

No AI code path moves money. Money changes state **only** through
`ledger.append()`, and every recovered amount traces to a capture confirmed by
re-reading live state.

---

## Screenshots

<!-- TODO(revivalos): add screenshots -->

- `docs/screenshots/overview.png` — Overview KPIs + recovery trend
- `docs/screenshots/replay.png` — Replay studio mid-run
- `docs/screenshots/guardrails.png` — "What the agent refused to do"
- `docs/screenshots/case-detail.png` — the decision log

---

## Docs

- [`docs/architecture.md`](docs/architecture.md) — the six layers + a diagram
- [`docs/agents.md`](docs/agents.md) — the 7 roles (AI vs deterministic)
- [`docs/metrics.md`](docs/metrics.md) — every formula
- [`AGENTS.md`](AGENTS.md) — coding standards + file map
