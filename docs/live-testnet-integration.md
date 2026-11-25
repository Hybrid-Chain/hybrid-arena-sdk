# Connect a game to live Testnet markets

Arena separates game development from market operation. Your authoritative server
reports game facts through its registered Studio source contract. Arena validates
the accepted release and event history, calculates a versioned estimate, and uses
finite resting orders to make quotes available. Players request their own fresh
admission before an order can execute. An installed SDK or a successful event
receipt does not open a market by itself.

## What is running now

As checked on November 25, Arena's hosted source sandbox is enabled. The original
continuous Star Quest Testnet lane and approved managed-creator markets are
commissioned. Their current player APIs return Testnet data; eligibility and
liquidity still depend on each response. The source, deterministic pricing and
finite-maker services operate in the background without an AI deciding prices
or submitting each quote.

Each eligible account receives one fixed $10,000 allocation of nonredeemable
Testnet credits, recorded as 1,000,000 integer units. Spending, logging in again
and changing games do not refill it. These credits are separate from earlier
pooled points, developer-lab units and the legacy exchange. Mainnet, real-value
funding and wallet payouts remain disabled.

Live two-sided quote availability is still being improved. A current game or
model estimate does not guarantee a bid, offer, immediate fill or exit. A new
request opportunity does not extend an earlier exact ticket. Source gaps,
stale models, held outcomes and unavailable depth remain explicit states.

## Choose an integration path

1. **Reviewed managed game.** Use the supported declarative blueprint package and
   Studio release workflow. Preserve the exact package/manifest hashes, original
   host facts, source clocks and accepted result. Native common-Testnet markets
   are limited to separately approved releases and bindings.
2. **Your own game server.** Start with `examples/signal-rush`, the Node or Python
   source client, and your actual game-scoped Studio authority. Validate and test
   events in the hosted sandbox. A reviewed outcome/source adapter, release
   eligibility and explicit native commissioning are separate requirements;
   arbitrary SDK events are not automatic common-Testnet market activation.

For either path, keep the original match and event request IDs, canonical bytes,
sequence and destination through retries and restarts. A transport retry uses a
fresh nonce, not a new original event or invented timestamp. Never copy private
operator admission, source-packet or liquidity credentials into a game client.
The optional practice-admission helper is a different contract from native
common-Testnet execution and must not be substituted for it.

## Discover and interpret current availability

Read [Arena discovery](https://hybrid-arena.com/.well-known/arena.json) and
[hosted source status](https://hybrid-arena.com/v1/status) before integration.
A non-200 response is unavailable or unconfirmed, not a reason to fall back to
fixture authority. Discovery describes implemented routes; the route's current
response and your actual release permissions determine availability.

`GET /api/health` separates real-value execution from Testnet configuration.
The deprecated `wager_execution:false` applies to real value; it does not disable
the separate Testnet lane. `testnet.configuration_present` and
`testnet.order_entry_requested` are configuration observations with
`runtime_probed:false`, not effective trading permission. Read the actual market
API next. `GET /api/providers` reports current Testnet order entry independently
of the legacy exchange; a stale or wrong-namespace view is unavailable. Enabled
entry still needs current admission, eligibility and finite executable depth.

The [public OpenAPI](https://hybrid-arena.com/api/openapi.json) describes current
player and Studio APIs separately from this SDK's stable source contract. Public
market reads are `/api/testnet/exchange/markets` for Star Quest and
`/api/testnet/creator-exchange/markets` for native creators. They do not allocate
credits or grant order authority. Quote-history reads retain actual observed
bid/ask samples with explicit gaps; historical midpoints are not current quotes.

Interpret these stages separately: accepted game event, source/model readiness,
new per-request admission, actual finite quote, accepted fill, terminal Testnet
settlement, and published game evidence. A Testnet account credit is not a wallet
payment; evidence inclusion is not independent gameplay adjudication. Existing
proof publication limits and independent creator/player acceptance remain open.

The coordinated 4097 window is now selected in Arena/Explorer and the existing
Core hint, with original roots and histories preserved. The original chain has
resumed. Genuine post-repair game confirmation remains a separately checked
backlog/verification gate; neither this selection nor a Testnet fill is a Wallet
payment or independent financial finality.

## Package versus deployed service

The [dated machine-readable observation](live-testnet-runtime-20261125.json)
records this distinction. Alpha.9's original package, manifests, models, policy,
evaluator and capability snapshots stay immutable. Older dated sections in the
agent handoff describe their original delivery phase; the current observation
supersedes their pending-runtime wording without changing SDK authority. This
update publishes no npm package and introduces no source or financial API.

The [exact operational evidence](https://github.com/Hybrid-Chain/hybrid-chain-prediction-markets/blob/b69f85f8d06e57c5ec4e193fb6fcae54241bb8d1/docs/testnet-source-packets-20261125/README.md) records the current autonomous
services, default-off transport proposal, real quote gaps and isolated test
limits. Quote coverage is not prediction accuracy, calibration or customer
acceptance. Check current runtime status again before an actual pilot.
