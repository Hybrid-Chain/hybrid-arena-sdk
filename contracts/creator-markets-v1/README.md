# Creator market-state contract v1 — alpha.9

The server-side `@hybrid-chain/arena-sdk/creator-markets` entry exports `projectManagedMarketState`, `validateCreatorMarketState`, `marketStateHash`, `estimateCreatorScoreWin` and the pinned model-policy constants. These are data/model helpers, with no hosted source credential, market-registration, ledger or payout authority.

The managed adapter projects the four reviewed game engines' **two genuine outcomes**, exact immutable manifest/package binding, original source match/epoch/tick, accepted event sequence, simulation time, source occurrence time, scores and terminal result. It excludes seed, targets, selections, input history, private names and account/seat/Steam identity. Do not pad a binary game with invented outcomes.

`validateCreatorMarketState` rejects unknown fields, wrong publisher/game/release hash, changed outcome mapping, malformed clocks, invalid phases, fabricated early terminal states and incorrect hashes. A content hash is not approval of a release or proof of public publication. Browser-supplied state is never source authority. The receiving adapter must independently authenticate the source, pin the exact eligible release, enforce durable epoch/sequence/clock/result continuity and recheck current source admission before an order.

## Experimental timed-score model

`creator-timed-score-v1` uses actual scores, an explicit symmetric prior and the fixed game duration. Deterministic integer arithmetic, a fixed live probability floor and largest-remainder partition preserve a million-part total over the declared outcomes. The model is uncalibrated, does not model player strategy and does not certify game fairness. Its unchanged policy commitment is `0a398bbf89b1ddce8f28456ee10d75326a4476ebbf1a342d20baede5ec4ecbfc`.

Live input expires after three seconds, with 500 ms future-clock tolerance. Waiting, held and canceled states produce no forecast; completed source results remain distinct from live quotes and settlements, and draws remain null. Explicit historical evaluation is an offline-only caller option, never a browser trade-request option. The generic data/model schema permits 2–16 outcomes; the managed adapter emits two. This is not engine approval for arbitrary cardinalities or games.

## Current Arena read-only integration

[Website 1e7306c](https://github.com/Hybrid-Chain/hybrid-arena-website/commit/1e7306cea5bf124ea4116c9a0ced54dfcd6e6d03) deploys `GET https://hybrid-arena.com/api/testnet/creator-pricing?game=<public-24-hex-id>&match=<original-32-hex-id>`. Public IDs and matches come from `/api/games` and `/api/games/<id>`. [Integration guide](https://hybrid-arena.com/integrations/markets/creator-pricing-v1/README.md).

The existing-store read-only projection checks the complete accepted prefix, exact original release/package, objective/score pairs, original source occurrence time, clock and final accepted receipt. Reads do not create a workspace, database, account, balance or market. New source facts retain original occurrence time; legacy facts are not backfilled. Old completed results remain original after a source key is revoked or a newer release is published. Stale/held/revoked live sources or missing original times return unavailable without fallback odds.

Responses explicitly retain `managed_host_provenance_verified:false`, `market_admission_eligible:false`, `executable_quote:false` and `value_movement:false`. A game-scoped HMAC-accepted batch is not proof the managed host emitted it or independent verification of game truth. The separate exact host-delivery/current-source-clock order join remains required. Original terminal evidence is not a financial settlement receipt.

The [isolated binary matcher foundation](https://github.com/Hybrid-Chain/hybrid-chain-prediction-markets/blob/e9da8e050dd4c16622531fdcc851c0af22880351/docs/ARENA_CREATOR_TESTNET.md) implements two-outcome collateral/conservation/void accounting, but creator market creation and execution remain inactive. Next: protected host provenance and live source admission, immutable common-Testnet registration, Studio eligibility, finite maker integration, binary API/UI/portfolio and an actual second-game buy/partial-exit/settlement/evidence trial. Developer-lab units and legacy points remain separate. Mainnet, wallet funding and real payouts remain unavailable.

The current two-second heartbeat plus two-second batching can exceed the unchanged model-age limit. Sustained quote availability needs a tested delivery/request budget; do not relax freshness, retimestamp events or treat repeated reads as new gameplay. Synthetic conformance is not independent player acceptance or real-data calibration.
