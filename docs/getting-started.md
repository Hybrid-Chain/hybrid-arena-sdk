# Connect a local game source

The first runnable release is `v0.1.0-alpha.2`. It exercises the proposed common
contract on your machine. Hosted game credentials and publishing are M3/M4.

## Source installation

```sh
git clone https://github.com/Hybrid-Chain/hybrid-arena-sdk.git
cd hybrid-arena-sdk
git checkout v0.1.0-alpha.2
npm ci
npm run build
python3 -m venv .venv
.venv/bin/python -m pip install ./python
```

Alternatively install the npm tarball or Python wheel from this repository's
GitHub release assets. These are downloadable packages, not registry listings.
Verify their SHA-256 values against the release manifest. Use the local installed
`arena` executable; do not download an unrelated package named `arena`.

## Start and exercise the reference receiver

```sh
node scripts/arena.mjs sandbox --demo --state .arena/server --port 8789
```

Keep that terminal open. The printed JSON identifies the loopback URL and its
limited assurance. In another terminal:

```sh
node scripts/arena.mjs validate contracts/game-provider-v1/fixtures/demo-manifest.json
node scripts/arena.mjs scaffold /tmp/my-arena-game
node scripts/arena.mjs demo --base-url http://127.0.0.1:8789 --state .arena/node-client
.venv/bin/python examples/demo.py http://127.0.0.1:8789
```

The synthetic game contains a start, a typed hit and a completion. Both clients
use the same fixture IDs/bytes and recover the same two reference receipts.
Restarting the receiver with the same state directory preserves its journal.
Rerunning the demo does not create another match or more events. Fixture scores
do not represent a native game, human play, wallet transfer or commercial activity.

The scaffold contains a manifest, match and event fixtures to adapt to a real
authoritative server. Match IDs, event IDs, sequence/ticks and outcome semantics
must come from that server's durable state. Do not generate fresh retry IDs after
a timeout. The reference registry is deliberately fixed to the demo release;
custom hosted registration is not available in this milestone.

## Node / TypeScript

Use `ArenaClient`, `MatchRequest`, `EventBatch` and `GameEvent` from the package.
The source example is `examples/demo.mjs` and declaration files ship with the
compiled package. `queueMatch`/`queueEvents` persist before transport; `deliver`
handles one request; `flush` drains in queue order and stops on the first failure.
`deliverWithRetry` performs explicit bounded retry/backoff for a single ID and
honors Retry-After. The caller schedules a later attempt if the server's delay is
larger than the selected bound. Closing/reopening preserves pending work.

## Python

Use `ArenaClient` as a context manager. `queue_match`, `queue_events`, `deliver`,
`flush` and `deliver_with_retry` provide the same semantics. The package includes
the canonical schema and uses its declared `jsonschema` dependency. See
`examples/demo.py`. The two SDKs share the same outbox format and signing vector.

## Run acceptance

```sh
npm run build
ARENA_PYTHON=.venv/bin/python npm test
.venv/bin/python -m unittest discover -s python/tests -v
```

Tests bind ephemeral loopback ports and create disposable private directories.
They do not use production keys, identity, a game allocation or customer funds.
The release includes a conformance report specifying the cases actually exercised.
