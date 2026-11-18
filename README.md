# Hybrid Arena SDK

Open game-provider contracts and server-side tools for integrating games with
Hybrid Arena. MIT licensed. This repository is the common-contract source for
future third-party integrations; existing CS2 and Star Quest protocols are preserved.

**Early preview:** TypeScript/Node and Python clients, a durable outbox, CLI and
loopback reference receiver are available. Hosted sandbox integration and Studio onboarding are described in the hosted quick start; inspect runtime availability before sending. Mainnet deployment and payouts remain later milestones. Packages are
distributed as source and GitHub release assets; no npm/PyPI registry publication
is claimed.

## Contract first

- [Protocol and recovery](contracts/game-provider-v1/README.md)
- [JSON schemas](contracts/game-provider-v1/schemas.json)
- [Reference OpenAPI](contracts/game-provider-v1/openapi.json)
- [Existing-game mappings](docs/game-mappings.md)
- [Agent instructions](docs/AGENT-HANDOFF.md)
- [Local quick start](docs/getting-started.md)
- [Delivery and recovery](docs/recovery.md)
- [Delivery status](docs/milestones.md)

Use Node 22.13+ on a POSIX host; Node 22 and 24 are checked in CI. The local
SQLite stores require owner-only POSIX permissions. Native Windows ACL support
and Unity/C# are follow-on work. From a checkout:

```sh
npm ci
npm run build
npm run sandbox
```

In a second terminal, send a synthetic three-event game to that local receiver:

```sh
node scripts/arena.mjs demo --base-url http://127.0.0.1:8789
```

For Python, create a virtual environment and install `./python`, then run
`python examples/demo.py http://127.0.0.1:8789`. Run `npm run test:contracts`
for schema/signing fixtures; full Node tests also use the installed Python SDK.
All default demo IDs/credentials are public fixture authority. The receiver
always listens on loopback and no command creates an Arena production match.

The same source protocol supports the local sandbox and canonical hosted sandbox. Hosted writes require a revocable game-scoped Studio key; the fixture key never grants hosted authority. Arena's current production operations are documented
at https://hybrid-arena.com/api/openapi.json and its capability manifest at
https://hybrid-arena.com/.well-known/arena.json.

Browser sign-in, source delivery credentials, match admission and wallet execution
have different authorities. A game source cannot grant itself any of them.

## Hosted Testnet integration

[Hosted quick start](docs/hosted.md) covers Studio registration, scoped source
keys, real receipt inspection and public Testnet evidence. Check the live status
before sending: hosting availability is separate from the SDK release. The
community directory supports feedback and release-bound promotion votes. Mainnet
application deployment and real-value authority remain separate rollout gates.

## Playable reference and creator tools

Run `arena starter my-game` for an editable Signal Rush mini-game, or `arena minigame --config /private/config.json --manifest manifest.json --state /private/state`. See [the full server integration](examples/signal-rush/README.md). The Arena browser preview is at https://hybrid-arena.com/developers/reference-game. Studio creator tools add sandbox outcome rules, delivery diagnostics, durable test-unit simulations, illustrative creator statements and promotion dry runs. Their first-party browser authority is separate from SDK source keys; no SDK method grants trading, wallet or Mainnet deployment authority.

## Creator workflow extensions (alpha.5)

[Guided setup, scoped CLI access and optional source-clock admission](docs/creator-next.md). [Independent creator pilot](docs/creator-pilot.md). Node helpers are separate from original Node/Python game-source authority. No funding, wallet submission or Mainnet activation.

## Managed browser-game packages (alpha.6)

Four reviewed reaction/race/battle/control blueprints are available as declarative
packages. `arena blueprint my-game --template drone-dash` creates a package and
agent brief; `arena check-package my-game/arena-game.json` checks offline conformance.
Upload through Studio's managed deployment workflow. No CLI command silently
creates a hosted match or grants publishing/wallet authority. See
[managed games](docs/managed-games.md) and the [package contract](contracts/managed-game-v1/README.md).

## Live pricing features (alpha.7)

The optional server-side `@hybrid-chain/arena-sdk/pricing` entry validates aggregate Star Quest observations and computes deterministic, versioned experimental Testnet estimates. It has no order, credit or payout authority. [Source, model, freshness and deployment boundaries](contracts/live-markets-v1/README.md). Existing game-provider delivery is unchanged; additional game execution requires separate adapters and acceptance.

## Offline forecast evaluation (alpha.8)

`@hybrid-chain/arena-sdk/pricing-evaluation` replays the unchanged pinned Star Quest model over complete original matches and reports equal-match Brier/log-loss, equal-prior baselines and calibration buckets. `node scripts/evaluate-live-pricing.mjs dataset.json [new-report.json]` runs entirely offline and refuses to overwrite a report. It does not certify input authenticity, calibrate/fine-tune a model, publish quotes or activate markets. [Dataset, holdout and trust requirements](docs/pricing-evaluation.md).

## Creator market adapter source preview

The [creator market-state contract](contracts/creator-markets-v1/README.md) projects the four actual managed game engines with their two real outcomes and immutable manifest/package/clock bindings. A versioned experimental timed-score model and exact synthetic source fixtures are included in repository source. This is not a published package entry, hosted market intake or activated common-Testnet integration. Binary matching, source admission and second-game acceptance remain next work.
