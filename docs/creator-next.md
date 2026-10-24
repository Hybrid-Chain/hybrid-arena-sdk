# Build, test and launch a game on Arena

Arena Studio: https://hybrid-arena.com/studio
Public SDK: https://github.com/Hybrid-Chain/hybrid-arena-sdk
Callable contracts: https://hybrid-arena.com/api/openapi.json
Agent discovery: https://hybrid-arena.com/.well-known/arena.json

## 1. Register the exact game

Sign in with Hybrid-ID. Create a workspace and game. In Releases, choose the
Signal Rush starter (two outcomes, 100ms/10Hz) or enter your real game's clock.
Register its immutable manifest and declared HTTPS launch/watch addresses.
The Studio checklist tracks **each exact release**. Download its manifest.
Arena does not deploy or host your external game from a URL declaration.

Download the current SDK npm tarball from GitHub Releases, install it locally,
and use `arena starter my-game --manifest /path/to/manifest.json`. Save that
same tarball as `my-game/vendor/arena-sdk.tgz`, then `npm install` in my-game.
The registry is not published to npm/PyPI; do not guess an npm version.

## 2. Connect the authoritative server

In Connect, issue a sandbox source key. Download it outside your source tree;
set its file mode to 0600. Only your server receives this key. Run
`arena minigame --config /private/source.json --manifest manifest.json --state /private/game`.
Open its loopback URL. This reference has one local human-input seat against a
labeled bot, not public multiplayer hosting. Public hosting needs TLS, authenticated
admission and abuse controls. The browser preview sends no source events.

Keep immutable request IDs/bytes and the durable outbox. Send the full ordered
match, including terminal evidence. Use Matches and Integration health to inspect
accepted facts separately from Testnet confirmation. Do not recreate a match to
hide rejected events. Publish on Testnet only after complete confirmed evidence.

## 3. Give a CLI or agent the minimum authority

Studio → CLI & agents issues credentials owned by the signed-in member and
bound to one publisher/game. Choose any subset of:

- `integration:read`: checklist and diagnostics.
- `release:create`: register immutable **draft** manifests.
- `outcome:create`: register immutable outcome rules.

Lifetime is 1–168 hours. Token plaintext is shown once; the server retains only
its hash. Revocation and current membership are checked on every request and
again after POST body consumption. Credentials cannot issue source keys, publish,
vote, review, adjust economics, place orders, read another game or reach wallets.
Source HMAC keys, browser sessions and developer bearer credentials are distinct.

Download a private access file; `chmod 600 /private/arena-developer-access.json`.
Use `arena studio --access /private/arena-developer-access.json` to inspect.
Use `--request original-command.json` for a draft release/rule; the file must
contain action, original 32-hex request_id and exact publisher/game binding.
Retry that same file after a lost reply. Never retry changed terms or put bearer
credentials in URLs, environment screenshots, browser bundles or source control.
Secrets lost during issuance must be revoked and replaced, not recovered.

## 4. Optional source-confirmed practice orders

Existing markets retain their original admission rules. A new market can pin
`admission_policy: source_confirmed_v1` in its immutable terms. Your source must
implement the extension **before** enabling it. IOC and FOK only; resting GTC
orders are rejected because a later fill would require fresh source approval.

The browser's original trade request is durably queued without moving test units.
The source reads GET `/v1/practice-admissions`, receiving at most 50 pending
requests with opaque game-specific account_ref, order intent, terms/request hash,
release, rule, epoch, accepted sequence, game time and batch digest. No Steam ID
or Hybrid-ID subject is returned. Pending requests expire after 30 seconds.

Flush authoritative events first. Atomically check your real game clock,
participation policy, terminal/cutoff state and any account-to-seat link before
approving. Do **not** echo Arena's checkpoint as if it were your current state.
An opaque account_ref alone does not authenticate a game player. A source-reported
role is not Steam ownership or a human attestation. Use watch/predict/join policies
explicitly; no source response gives a player a seat.

POST the exact decision fields documented in OpenAPI. Every request signs:

```
ARENA-PRACTICE-ADMISSION-V1
GET or POST
/v1/practice-admissions
publisher_id
sandbox
unix_timestamp_seconds
fresh_32_hex_nonce
sha256_of_raw_body
```

HMAC-SHA256 with your current game source secret, using all normal X-Arena signing
headers. GET signs an empty body. POST is canonical JSON. This separate domain
cannot authenticate original game-event routes and vice versa. The Node SDK
provides `PracticeAdmissionClient`; the original source protocol remains unchanged.

The source receipt is journaled and expires after two seconds. On explicit
original-request recovery, Arena checks unchanged sequence/epoch/time/batch,
freshness, source entry cutoff, market revision and terms in the same transaction
as the fill. A newer source batch, expiry, rejection, held/terminal match or changed
quote fails closed. Recover the same source response after a lost reply; changed
responses conflict. This is source-clock admission for non-value simulations,
**not native pre-trade consensus, anti-cheat certification or funded fairness**.

## 5. Trial, evidence and settlement fixtures

Creator tools → Pilot & Testnet adapter links the independent test plan and records
private self-reported trial effort/blockers. Reports are not independent acceptance.

After a filled simulation resolves and its exact complete match is Testnet confirmed,
an owner can prepare a settlement intent and record it in an isolated wallet-adapter
fixture. The intent binds release, rule, terms, decision, source-evidence digest and
exact nonredeemable credits. It has an immutable digest and one receipt per market.
Lost-response/restart recovery never duplicates credits. Original practice balances
and creator `paid:0` statements remain unchanged. This is a delivery-contract fixture,
not a crypto payout: no real wallet, crypto asset, signing, transfer, spending or
external network submission is implemented or enabled by it.

## Operations and trust

Daily consistent backup plus isolated restore validates SQLite integrity, every
simulation's conservation and retained source-key decryptability. Backups are
private and retained; the drill never replaces production or changes authority.
Operator reports show storage, event quotas, stale sources and restore recency.
Review storage retention separately; permanent clips, receipts, keys and final
statements must not be deleted by a generic quota job.

Proof windows are bounded to 1,024 verified successors. Before the next boundary,
verify the entire interval and all four retained voter journals, publish the
reviewed pin to Arena/Explorer, then install the protected Core hint. No receipt
may nominate a trust checkpoint. Original genesis/SQL trust, keys and history
remain unchanged. The current chain is one Core operator/host, 3-of-4 Testnet
signing processes, not independent distributed Mainnet consensus.

Real funding, exchange execution, creator payments and Mainnet deployment remain off.
