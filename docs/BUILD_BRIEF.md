# The build brief

ReOS was built end-to-end from a detailed, phased brief. This document captures that
brief so anyone can see exactly what was asked for and reproduce the build from
scratch. The kickoff research that informed it lives in [`docs/research/`](research).

---

## Goal

A **Revenue Recovery Control Plane** for the Razorpay AI Buildathon (Track 03 — AI
Revenue Recovery). A merchant loses revenue across four surfaces — payment failures,
abandoned checkouts, failed subscriptions, overdue receivables. The system detects
each at-risk event, **reconciles it against live state**, chooses **one** bounded
intervention inside a **policy the merchant owns**, and **proves the exact money
recovered** — subtracting refunds and disputes back out.

> **Thesis:** Given a verified revenue-risk event, recover the most money with the
> least customer friction — and prove exactly what happened, why, and when we chose
> to stop.

It had to be a **desktop operations console** (Linear / Stripe Dashboard / Retool),
not a chatbot — a case queue, a decision log, and a replay studio.

---

## The laws (non-negotiable)

1. **Folder lock** — work only inside the project folder.
2. **Strict step order, with gates** — each layer proven before the next is built.
3. **Nothing dead, nothing fake** — every screen renders real data; every control works.
4. **Money truth is deterministic** — no AI path moves money; money changes state
   only through `ledger.append()`; every recovered amount traces to a **verified**
   capture confirmed by re-reading live state; refunds/disputes are subtracted back out.
5. **Autonomy** — sensible defaults, no mid-build questions.
6. **Quality** — TypeScript strict, reuse the services layer, clear over clever.
7. **Honest self-report** — never call a gate green if it is not.

---

## The phased plan (Steps 0 → 12)

| Step | Deliverable |
|---|---|
| 0 | Scaffold — Next.js + TypeScript + Tailwind + shadcn/ui + Prisma + Vitest; boots to a shell |
| 1 | Data foundation — the full Prisma schema (append-only `LedgerEntry`) + singleton client |
| 2 | Seed — realistic data across all 5 lanes, incl. the special demo cases |
| 3 | Adapters — AI (`MockProvider` default) + Razorpay (`MockRazorpay`, can contradict a webhook) + fixtures |
| 4 | The six-layer engine — ingestion, normalize, reconcile, decision, ledger, audit + metrics + policy |
| 5 | Agent layer — 1 orchestrator + 3 AI + 3 deterministic + guardrails (dark-pattern screen, allowlists) |
| 6 | Tests — the credibility core (reconcile no-op, dedupe, ledger refund, retry stop, incremental, dark-pattern) |
| 7 | Dashboard shell & design system — sidebar, top bar, reusable components |
| 8 | API routes — Zod-validated, reusing the services |
| 9 | Core screens — Overview, Cases (+ decision log) |
| 10 | Control screens — Approvals, Guardrails, Ledger, Policies, Agents |
| 11 | Replay & Experiment Studio + Metrics + audit export + CLI demo |
| 12 | Docs, full verification, Git |

Each step ended with a **gate** (build passes, tests pass, screens render, no dead buttons)
that had to be green before moving on.

---

## Stack (as specified)

Next.js (App Router) + TypeScript (strict) · Tailwind + shadcn/ui + lucide · TanStack
Table + Recharts · React Query + Zustand · Zod · Prisma + SQLite (Postgres-portable) ·
Vitest · an AI seam (mock default + OpenAI-compatible driver) · a payments seam (mock
default + real REST/webhook-verify stubs). **Must run in mock mode with zero keys.**

---

## The six scripted moments (the demo weapon)

1. Stale `payment.failed` on an order that is now paid → intelligent **NO-OP**.
2. Duplicate + out-of-order event → reconciliation **blocks** a second charge.
3. Abandoned cart recovered via a consented message → attributed paid order.
4. Pending subscription **stopped** at the retry budget (T+3 = 3) with an explanation.
5. High-value overdue receivable **routed to human** review.
6. A recovered payment later **refunded** → ledger auto-subtracts.

---

## Acceptance checklist

- Boots with zero external secrets.
- Every screen renders seeded data; no dead buttons, no 404s, no placeholders.
- No AI code path moves money; money moves only through `ledger.append()`.
- Stale-failed-but-paid is a logged no-op; a duplicate event is deduped.
- A refund auto-subtracts from net.
- Saving a policy creates a new version; each case records its `policyVersion`.
- Replay walks all six moments; the holdout toggle changes incremental.
- Every case has a complete audit trail; audit export downloads.

---

## Beyond the original brief (v2)

After the core system, the product was extended into a polished, demoable app:

- **Role-based auth** — signed-cookie sessions, bcrypt passwords, four roles with
  tailored dashboards, enforced in middleware and on the API.
- **Brand & design** — the **ReOS** identity, an Apple-minimal black-&-white palette
  (colour reserved for data), cursor-reactive glow, page-transition motion, and
  hover-reveal KPI cards.
- **Baymax** — a draggable in-app AI companion on **Google Gemini** (Settings → Connect
  Gemini, with a Test-connection check) and a full offline fallback.
- **Editable profiles** (photo + impact stats), a **Settings** workspace with team &
  connections, and a creator credit throughout.
