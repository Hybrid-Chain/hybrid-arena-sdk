# Offline live-pricing evaluation

This tool prepares the model-evaluation portion of the live Testnet program. It does not claim a real dataset has been accepted, a model is calibrated, or source deployment and actual trading have passed. The frozen `starquest-score-health-v1` module and policy bytes/hash are unchanged.

## Supply complete original matches

Use `contracts/live-markets-v1/evaluation.schema.json`. The root contains schema `arena.pricing-evaluation-input.v1`, exact model_version/model_hash, and `matches`. Each entry contains its original 32-hex match_id, split (`development` or `evaluation`), ordered original live `observations`, and the original completed `terminal` feature snapshot. Every feature retains its canonical observation hash and public-safe aggregate contract.

All live observations must precede the final tick/time, retain exact original match/epoch/mode/rules, and have strictly increasing ticks and nondecreasing observation times. Duplicate matches across either split, repeated ticks, changed clocks, changed rule limits, unknown fields and cross-match labels refuse. The evaluator never invents missing frames or a terminal result. It caps 500 matches, 20,000 observations per match and 100,000 observations overall. The CLI accepts one regular non-symlink JSON file of at most 64 MiB.

Divide datasets by complete original matches before any model selection. This helper never fits parameters; an operator-supplied split does not prove a held-out evaluation was independently governed. Review source authentication, result authority, completeness, selection bias and label integrity separately. Source-export hashes alone do not authenticate a game or prove anti-cheat. No raw match/epoch/account/observation history is included in the aggregate report.

## Run locally

```js
import {evaluateStarQuestHistory} from '@hybrid-chain/arena-sdk/pricing-evaluation';
const report = evaluateStarQuestHistory(completeMatchDataset);
```

```sh
node scripts/evaluate-live-pricing.mjs dataset.json new-report.json
```

Omit the report path for standard output. A report is created with owner-only permissions and exclusive creation; an existing file is never replaced. There is no network call, service restart, live model selection, ledger grant, order, settlement or wallet operation.

## Interpret the report

Each match receives equal weight, then its eligible frames receive equal weight. Report Brier score (four-outcome sum of squared errors), negative log likelihood, and the same equal-prior baselines (0.75 and ln(4)). Per-mode summaries use the same convention. Calibration buckets give equal-match-weighted mean forecast and observed outcome fraction; they are descriptive measurements, not calibration certification.

Draws are counted and excluded because this model has no draw category. Decisive-but-not-final observations are counted and excluded because the model emits no live probability there. Development matches are validated but excluded from evaluation metrics. If no eligible decided evaluation match remains, metrics are null. Missing real matches are not replaced by the provided synthetic example. Reports always state source_authenticity_verified=false, calibrated=false, parameter_fit_performed=false, executable_quote=false and financial_execution=false.

Before production claims, collect authorized original observations and terminal outcomes, review coverage and independence, run held-out real-match evaluation and inspect error by mode and game progress. Retain every original hash and model version. Do not import this historical-mode helper into a live quote path.
