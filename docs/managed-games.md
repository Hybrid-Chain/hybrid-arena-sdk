# Managed browser-game launch kit

The initial Arena managed package uses reviewed server engines, not arbitrary
Node uploads. Choose Signal Rush (reaction), Drone Dash (race), Robot Duel (battle)
or Core Control (objective control). Packages conform to
contracts/managed-game-v1/package.schema.json and contain no credentials.

`arena blueprint my-game --template drone-dash`
`arena check-package my-game/arena-game.json`

Register your game in Arena Studio, then upload the package under Deploy.
The workspace owner confirms deployment: it registers an exact immutable release
and rotates this game's source key. This does not publish a listing or create a
match. Studio supplies the authoritative publisher/game identifiers and manifest.
Every gameplay event uses the original game-provider-v1 contract; existing custom
Node/Python source integrations and their byte-pinned schema remain supported.

Open the creator-preview lobby. Create a match using your Hybrid-ID session,
inspect the separate practice desk, and start when ready. Browser input never
supplies the score, outcome, clock or source signature. One real authenticated
player competes against a clearly labeled bot. A read or a preview does not create
activity. Private seat ownership is scoped to the game and never published.

Source facts and exact batch boundaries persist across restart. Retrying an input
or deployment preserves its original request ID and terms. Never rewrite terminal
facts or replace uncertain operations with new IDs. Lost responses must recover
before editing parameters. Simulation pauses during downtime/delivery outage.

After a completed run, inspect source receipts and complete native Testnet
coverage. Publish that exact release through Studio. Share its Testnet page,
collect public feedback, and use release-specific promotion votes. A creator's
private pilot report remains self-reported/unverified until independent acceptance.

Stop hosting cancels unfinished runs without deleting evidence. Runtime rollback
selects a retained package; restore its public release with an explicit publish
operation after confirming its evidence. Deployment credentials never grant
publishing, trading, wallet or Mainnet authority to a development agent.

External custom gameplay engines continue to use the editable Signal Rush server
starter or original Node/Python SDK. Managed execution of custom repository code
is a separate reviewed hosting capability. No npm lifecycle script or remote URL
is executed by a managed package.

Practice desks use finite simulation liquidity and nonredeemable test units.
Source authentication and Testnet inclusion do not certify anti-cheat or authorize
financial settlement. Real funds, wallet submission and Mainnet activation stay off.
