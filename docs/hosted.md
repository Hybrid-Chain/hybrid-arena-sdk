# Connect to the hosted sandbox

The canonical origin is `https://hybrid-arena.com`. First inspect
`GET /v1/status`; disabled/unavailable means stop and retain original requests.
Use SDK `v0.1.0-alpha.3` or newer, which accepts hosted sandbox receipts.

1. Sign in to [Arena Studio](https://hybrid-arena.com/studio) with Hybrid-ID.
2. Create a publisher workspace and game. Register an immutable release with its
   actual clock, outcome IDs and game/rules versions. The form generates outcome
   IDs `team-1`, `team-2`, etc. Your HTTPS game remains developer-hosted.
3. Opt in to the filtered public Testnet evidence projection. Raw actor IDs,
   arbitrary labels, publisher identity and private credentials are not published.
4. Create a game-scoped source key. Save its secret once, in a private server
   configuration. Rotation revokes the old key immediately; keys expire in 30 days.
5. Configure `ArenaClient` with that origin, publisher/game IDs, key/secret,
   `environment: sandbox`, and a persistent private outbox path. Never use the
   public local fixture key or browser storage for a hosted source secret.
6. Submit/recover a complete sandbox match. Use the exact registered outcome IDs
   and release versions. Inspect real receipts and the private event journal in
   Studio. Preserve original IDs/bytes across failure, including after restart.
7. Wait for the separately published Testnet checkpoint to confirm in Explorer,
   then publish the release to the community Testnet directory.

After a Node source install:

```sh
chmod 600 /absolute/path/arena-source-key.json
node examples/hosted.mjs /absolute/path/arena-source-key.json /absolute/path/manifest.json /absolute/private/state
```

This command submits an explicitly **synthetic** three-event acceptance match,
not a real player session. Reruns recover its persisted original IDs. It does not
start the game itself. Real sources must send their own authoritative journal.

The sample manifest download is available in Studio's Releases tab. Both SDKs
accept the same hosted origin and schema/signing rules; Python uses `ArenaClient`
with keyword options shown in `examples/demo.py`, replacing fixture authority
with the private server configuration above.

Public release pages support feedback, sharing and one active promotion vote per
Hybrid-ID account per release. The default threshold is 25 and is operator
configurable. Reaching it queues review; authorized reviewers can record a vote
threshold override. This is account-based feedback, not proof of unique humans.
A new release does not inherit votes. Technical evidence is still required.

Mainnet application deployment is not active in this milestone. Approval records
are promotion decisions, not Mainnet transactions, liquidity, real-value wagering
or payout permissions. Local/hosted acceptance does not certify anti-cheat or
correct game physics. Existing CS2/Star Quest integration contracts remain intact.
