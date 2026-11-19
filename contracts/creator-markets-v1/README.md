# Creator market-state contract v1 — alpha.9

## Current hosted integration — November 19, 2026

Arena's reviewed managed blueprints now connect actual game state to native binary
Testnet contracts: live finite bids/asks, reviewed orders, partial exits, original
request recovery, account-owned positions and accepted-result settlement.
The [player API and native guide](https://hybrid-arena.com/integrations/markets/creator-pricing-v1/native-admission.md)
and [Arena agent manifest](https://hybrid-arena.com/.well-known/arena.json) describe
current browser routes and availability. Browser writes use the current Arena
session and Origin/CSRF; they are not delegated external trading credentials.

The selected [52-path internal engine](https://github.com/Hybrid-Chain/hybrid-chain-prediction-markets/blob/e164a855cb0e1024b113b8e69c9cdba55a618aad/docs/arena-practice.openapi.json)
and [Arena player implementation](https://github.com/Hybrid-Chain/hybrid-arena-website/commit/877326410dd3f3fd96c36016b99022b83967ec8f)
use a genuine persistent native source stream, dedicated source-only authority and
one bounded maker. A creator cannot register an arbitrary financial source merely
by installing this package. Externally hosted integrations retain their reviewed
Studio/event contracts; the managed native adapter is not universal game admission.

A live Core operator test produced 36 fresh observations, eight complete two-way
depth observations, four distinct quote sets and an accepted terminal settlement.
It is explicitly synthetic/operator activity: no participant grant or order was
submitted, no human adoption is claimed, and depth was not continuously available.
Actual quotes are finite; an estimate or last trade never guarantees an entry/exit.
Independent creator/player testing and sustained liquidity coverage remain open.

## Unchanged package authority

`@hybrid-chain/arena-sdk/creator-markets` exports `projectManagedMarketState`,
`validateCreatorMarketState`, `marketStateHash`, `estimateCreatorScoreWin` and the
pinned model-policy constants. These helpers grant no source credential, release
approval, market registration, account credit, order or wallet authority.
The published alpha.9 package and its historical artifacts are unchanged.
This current repository guide is not a replacement package release.

The adapter projects all four reviewed managed engines into their **two genuine
outcomes**, immutable manifest/package hashes, original match/epoch, tick,
sequence, source occurrence time, scores and terminal result. Seeds, targets,
selections, input history, private names and account/seat/Steam identity are excluded.
Do not pad a binary game with invented outcomes or substitute browser state.

The native execution sequence J is separate from produced host facts F and accepted
Studio delivery N. The owning adapter validates the original counters/prefixes and
current eligible release. A read never refreshes gameplay or an old admission.
`request_admission_available` permits requesting a NEW game ticket, subject to both
execution gates, balance and actual depth. It does not reserve a fill or renew an
expired `admission_until`. Original UUIDs and terms survive uncertainty and restart.

## Experimental timed-score model

`creator-timed-score-v1` uses actual scores, a symmetric prior and fixed duration.
Deterministic integer arithmetic, a live probability floor and largest-remainder
partition preserve a million-part total over the declared outcomes. Its unchanged
policy commitment is `0a398bbf89b1ddce8f28456ee10d75326a4476ebbf1a342d20baede5ec4ecbfc`.
It is uncalibrated, does not model player strategy and does not certify fairness.
An experimental win estimate is separate from an executable bid, ask or exit.

Preserve original source times and complete match splits when evaluating the model.
Missing, stale, held, conflicting or ineligible sources must fail closed. Quiet
heartbeats carry original game facts; repeatedly reading an old fact creates no
new observation. Never retimestamp a queued or terminal event to make it current.

## Testnet accounts, finite liquidity and results

Native binary and Star Quest contracts use the common once-only $10,000 Testnet
account allocation, in integer cents. No refill or legacy conversion. A native
winning contract redeems $1; an accepted native void redeems $0.50. Star Quest
retains its four-house policy and $0.25 void. Pooled points, earlier per-market
creator-lab units and the old exchange keep their own original records.

One fixed nonredeemable maker allocation has global cash/inventory/exposure limits.
It is not participant money, automatic creator earnings or unlimited exit liquidity.
A queued order is not a fill. A fill is not a wallet payout. A closed match may
await accepted terminal settlement. Game admission is independent of market entry;
a contract purchase does not grant a player seat.

## Evidence and acceptance boundaries

The public creator-pricing API independently checks the immutable accepted game
prefix/receipt against the protected host where available. That is single-operator
source attribution, not independent gameplay truth, anti-cheat or native finality.
Source authentication, market settlement and native Testnet proof confirmation are
separate. The Arena/Explorer proof-window repair remains a distinct operator track.

The isolated actual game/native-journal/Rust HTTP/MySQL/maker trial bought three
contracts, sold one, recovered a lost committed mint and reconciled final balances.
Compiled disposable AuthStore/journal/HMAC/restart and browser fixtures are separate
synthetic checks. Neither constitutes independent creator/player acceptance.
Mainnet, real funds, wallet funding and wallet payouts remain disabled.

Historical source-only checkpoints remain pinned in
[the preceding guide revision](https://github.com/Hybrid-Chain/hybrid-arena-sdk/blob/8b80d9f1ad870a201972afc81a8f4e884a31f1c5/contracts/creator-markets-v1/README.md).
