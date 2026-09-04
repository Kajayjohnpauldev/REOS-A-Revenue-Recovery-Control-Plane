# Contributing to ReOS

Standards for working in this codebase. Keep the core honest and the tree clean.

## Principles

1. **Money truth is deterministic.** No code path may move money outside
   `ledger.append()`. Every recovered amount traces to a capture confirmed by
   re-reading live state; refunds/disputes are subtracted back out.
2. **Reuse the services layer.** Never re-implement money or decision logic inside a
   component or a route handler.
3. **TypeScript strict.** No `any` without an inline reason. Validate every API input
   with Zod.
4. **Nothing dead, nothing fake.** Every screen renders real data; every control does a
   real thing.
5. **Runs with zero external secrets.** Mock providers are the default.

## Conventions

- Monetary integers are **whole INR rupees** everywhere (see `prisma/schema.prisma`).
- Prefer **pure, DB-free helpers** (`scoreCase`, `sumTotals`, `computeIncremental`,
  `checkRetryBudget`) so the core stays unit-testable.
- Client components import server types with `import type` only (keeps the DB client out
  of client bundles).
- Prisma is pinned to a stable version for reproducible migrations.

## Getting started

```bash
npm install
npm run seed     # migrate + seed the demo data
npm run dev      # http://localhost:3000
npm run test     # the credibility core must stay green
```

See **[`documents/engineering-guidelines.md`](documents/engineering-guidelines.md)** for the full
module map and architecture pointers, and **[`README.md`](README.md)** for the product
overview and demo walkthrough.
