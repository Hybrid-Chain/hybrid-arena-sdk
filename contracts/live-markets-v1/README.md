# Live pricing feature extension — 2026-11-18.1

The `@hybrid-chain/arena-sdk/pricing` **server-side** helper validates authoritative aggregate Star Quest observations and calculates a deterministic versioned Testnet win estimate. It does not send an order, grant credits, create liquidity, authorize a customer, settle a balance or publish evidence. Client-side use cannot establish trusted game facts or execution authority.

Source implementation: [pricing PR 14](https://github.com/seanprescott/starquest/pull/14); [independent continuous source lane PR 15](https://github.com/seanprescott/starquest/pull/15). The source host must deploy these; source availability is not established by this package. Its private signed routes are not public developer order endpoints. Existing game-provider-v1 delivery, source keys, original requests and Testnet evidence remain separate.

## Model and trust

`starquest-score-health-v1` uses bounded integer arithmetic and a canonical policy hash. Inputs include station/fleet hull, installed shields, surviving modules, mode-specific objectives, relative scores and applicable remaining time. Four symmetric initial states receive four equal priors. Station destruction does not turn a timed points contender into an impossible outcome. Final winner, drawn/void result and a decisive but not-final state are separate from live estimates.

The output sums to 1,000,000 parts and has a small explicit live probability floor. It is an **experimental, uncalibrated model**, not a measured frequency guarantee or an executable price. A finite identified market maker may later derive quotes with spread, inventory and collateral limits. A midpoint or probability alone does not promise a fill or exit.

Exact input hashes include the process epoch, simulation tick and source observation time. The default estimator rejects observations older than three seconds or too far in the future. The receiving service must also persist/check epoch and monotonic game time and honor the source's independent admission/terminal/hold authority. `allowHistorical:true` is for an explicit offline evaluation tool only; a request cannot choose it in live execution.

The content hash is not an independent source signature, anti-cheat attestation or chain certificate. Public-safe aggregates exclude names, personal IDs, seats, tokens, precise positions and individual loadouts. Unknown fields and malformed capacities are rejected rather than projected into a public payload.

## Example

```js
import {estimateStarQuestWin} from '@hybrid-chain/arena-sdk/pricing';
// Obtain this from the approved server-to-server source adapter, never a player.
const estimate = estimateStarQuestWin(authoritativeSnapshot, {now: Date.now()});
if (estimate.state === 'live') console.log(estimate.probabilities_ppm);
// executable_quote is always false. No account or order is changed.
```

`fixtures/starquest-features.json` contains actual disposable Room projections for all four modes. They are synthetic test games, never published live prices or customer acceptance. The tests verify their canonical input hashes and deterministic output, terminal/draw handling, stale/private data rejection and frozen model parameters.

## Evaluation and further games

Collect source-confirmed observations and terminal labels per original match before claiming predictive performance. Evaluate whole held-out matches; do not split frames from one match between training and validation or overweight a long match by its frame count. Record Brier score, log loss, calibration and the equal-prior baseline with source/model versions. No real dataset acceptance or calibration is claimed by this release.

This initial model adapter supports Star Quest's four reviewed modes. Other games keep their existing source/event contracts and are not automatically eligible for live Testnet execution. A new adapter needs explicit features, outcome rules, freshness, terminal/correction policy, bounded liquidity and acceptance; unknown metrics never default to invented zero values. Python continues to provide the existing source-delivery SDK and has no pricing helper in this release.
