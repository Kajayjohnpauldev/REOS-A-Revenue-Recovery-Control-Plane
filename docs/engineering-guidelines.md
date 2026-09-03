# Engineering guidelines

How the codebase is organised, and the rules that keep it trustworthy.

## The one rule that matters

**Deterministic code owns all money truth.** Classification, drafting, extraction, and
prioritisation may be assisted; **moving money is not.** Money changes state only through
`ledger.append()` (append-only), and a recovery is recorded **only after re-reading a
verified live capture**. This is enforced structurally, not by convention.

## Module map

```
prisma/
  schema.prisma            12 models; LedgerEntry is APPEND-ONLY
  seed.ts                  merchant, role users (bcrypt), 15 cases across 5 lanes
  fixtures/                live entity states (with contradictions) + webhook stream
  migrations/              versioned SQL migrations
src/
  proxy.ts                 auth + role gating (edge)
  lib/
    db.ts env.ts types.ts format.ts   singleton client · zod env · domain types · formatters
    api.ts api-types.ts hooks.ts       route helpers · client types · React Query hooks
    assistant.ts                       the in-app helper (Gemini + offline knowledge base)
    auth/                              session (HMAC cookie) · roles/permissions · contexts
    ai/                                provider interface · mock (default) · openai · index
    razorpay/                          adapter interface · mock (default) · real · verifySignature
    policy/engine.ts                   eligibility + stop rules (pure, unit-tested)
    services/                          ingestion · normalizer · reconcile · decision · ledger ·
                                       audit · metrics · replay · caseActions · caseQueries · policyStore
    agents/                            orchestrator + 3 assisted + 3 deterministic roles
                                       + dark-pattern screen · registry · prompts
  app/
    login/                             branded split-screen login
    (dashboard)/                       the screens (overview, cases[/id], approvals, guardrails,
                                       ledger, policies, agents, replay, metrics, settings, profile)
    api/                               Zod-validated route handlers
  components/                          brand · shell · kpi · charts · assistant · ui · ui-ext
  tests/                               engine + adapter + DB integration tests
scripts/demo-replay.ts                 CLI: prints gross / incremental / net
docs/                                  architecture, agents, metrics, build brief, this file
references/                            source research + the build brief materials
```

## The six layers (engine)

1. **Ingestion** — verify signature, store the raw event, **dedupe on `idempotencyKey`**.
2. **Normalize** — map a Razorpay-shaped payload into one `Case`, keeping source fields.
3. **Reconcile** — re-read **live** state; a stale "failed" webhook on a settled entity is
   a logged **no-op** (`already_paid`) — the double-charge firewall.
4. **Decision** — `amount × probability × urgency − cost − harm`; emits reason code,
   confidence, and the `policyVersion` it decided under.
5. **Ledger** — the only money mutation; append-only; refunds are negative entries so net
   auto-corrects.
6. **Audit** — ordered case timeline + JSON/CSV export.

Supporting: a pure **policy engine** (retry budget T+3, thresholds, consent), **adapters**
(mock ⟷ real, chosen by env — the mock can return a live state that contradicts a webhook),
and an **agent layer** whose every tool call is allowlist-bounded and logged.

## Testing

`npm run test` runs the credibility core: reconcile no-op, dedupe, ledger refund exclusion,
retry-budget stop, incremental math, dark-pattern rejection, and out-of-allowlist refusal.
Keep it green before shipping any change to the engine.

See also: [`architecture.md`](architecture.md) · [`agents.md`](agents.md) ·
[`metrics.md`](metrics.md).
