# Metrics

All ten measures are computed from the immutable data in
`src/lib/services/metrics.ts`. Merchant recovery and (hypothetical) platform value
are kept separate. Money integers are whole INR rupees.

Let `T` = treatment cases, `H` = holdout cases, `recovered(c)` = `actionResult ==
"recovered" || recoveryAttribution > 0`.

| # | Metric | Formula |
|---|---|---|
| 1 | **atRiskValue** | Σ `amount` over open cases (`!recovered && reasonCode ∉ {already_paid, already_settled}`) |
| 2 | **eligibleRate** | `eligible / total`, where eligible = cases with a real proposed action (`proposedAction ≠ noop`) |
| 3 | **recoveryRate** | `recoveredCount / eligible` |
| 4 | **grossRecovered** | Σ positive ledger entries (verified captures) |
| 5 | **incrementalRecovered** | `treatmentRecoveredValue − treatmentTotalValue × holdoutRate`, where `holdoutRate = holdoutRecoveredValue / holdoutTotalValue` |
| 6 | **netRecovered** | `grossRecovered − refunds` (refunds = Σ \|negative ledger entries\|) |
| 7 | **falseActionRate** | `falseActions / actioned`, falseActions = cases acted on that were already paid (`reasonCode == already_paid && recoveryAttribution > 0`) |
| 8 | **customerHarmRate** | `harmfulSent / sentMessages`, harmfulSent = sent messages failing the dark-pattern screen **or** sent without consent |
| 9 | **automationVsEscalation** | `{ automated, escalated, automationRate = automated / (automated + escalated) }` |
| 10 | **auditCompleteness** | `completeTrails / total`; a case has a complete trail if it has an event, a `reasonCode`, and — when it moved money — a ledger entry |

## Incremental, in words

Incremental recovery is the honest number: **treatment recovered minus what
treatment _would_ have recovered at the holdout group's natural (untreated) rate.**

```
holdoutRate = holdoutRecoveredValue / holdoutTotalValue
baseline    = treatmentTotalValue × holdoutRate
incremental = treatmentRecoveredValue − baseline
```

`computeIncremental()` is pure and unit-tested. Worked example: holdout recovers
20/100 (20%); treatment recovers 60/100; baseline = 100 × 0.2 = 20; incremental =
60 − 20 = **40**.

## Supporting series

- **getLaneSummaries()** — per-lane `{ count, atRiskValue, recoveredValue }` for the
  overview tiles and the by-lane chart.
- **getRecoveryTrend()** — cumulative `{ recovered, refunds, net }` by day from the
  ledger, for the recovery-over-time chart.

Any figure derived from the mock experiment (incremental) is labelled **SIMULATED**
in the UI.
