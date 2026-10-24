# Signal Rush: complete reference mini-game

A 20-second skill mini-game: capture the lit cell while a labeled bot competes.
The Node server owns the 100ms simulation, scoring, cooldown, round results and
terminal winner. Browser input never supplies scores, clock ticks or source keys.
State, exact source facts, batch boundaries, input IDs and the SDK outbox survive
restart. Simulation pauses while the server is stopped. A retry preserves original
facts; it never starts a replacement match. One match per private state directory.

## Local end-to-end run

1. Build the SDK: `npm ci && npm run build`.
2. Start `arena sandbox --demo --state /tmp/arena-receiver`.
3. Create a new owner-only directory and configuration file (mode 0600):

```json
{"base_url":"http://127.0.0.1:8789","key_id":"demo-key","publisher_id":"demo-studio","game_id":"demo-duel","environment":"sandbox","secret_hex":"0101010101010101010101010101010101010101010101010101010101010101"}
```

4. Run `node examples/signal-rush/server.mjs /private/config.json contracts/game-provider-v1/fixtures/demo-manifest.json /private/signal-state`.
5. Open `http://127.0.0.1:8790` to play or watch. Wait for accepted match creation
   before starting. Reload or restart with the same configuration and state path
   to test recovery. New state paths intentionally create new matches.

The fixture secret is public and valid only on the loopback receiver. No fixture
key can send facts to the hosted Arena service.

## Connect your own hosted Testnet release

Register a two-outcome release in Studio, download its exact manifest, issue a
game-scoped key and save the downloaded configuration as mode 0600. Use those
files instead of the local fixture above. The SDK delivers to the fixed canonical
HTTPS origin; credentials stay in the server process and private stores.

The game still listens only on loopback. Public deployment requires your own
reviewed TLS proxy, player authentication/admission, origin configuration and
abuse controls; this example is not a public multiplayer hosting service. Set
your real HTTPS launch/watch URLs in the Studio release, not the loopback URL.
Do not publish the fixture as a supposedly independent community game.

The server creates the match before play begins. Wait for its accepted receipt,
then create an immutable `match_winner` rule and developer-simulation market in
Studio if testing participation. Start the game afterward. `arena.objective`
deltas and `arena.round_completed` results also exercise stat/round templates.
Each round is five seconds. Inspect accepted facts, decision receipts and the
separate native Testnet proof in Studio and Explorer.

Agent implementation checklist: preserve server-authoritative inputs; use exact
release IDs; preserve private state and original outbox destination; label bot and
test activity; expose source gaps rather than reconstructing missing facts; never
put source keys in client JavaScript; never infer payout authority from a receipt.
