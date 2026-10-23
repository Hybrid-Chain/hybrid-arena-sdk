# Game provider contract v1 — early preview

Contract version: `2026-10-23.1`. Availability: local reference only.

A registered release declares publisher/game/version/ruleset, possible outcomes,
capabilities and source-clock precision. The reference registry is fixture-owned;
there is no self-registration API. A signed match request must match this release.
Opaque match-local actors may be assigned to outcomes; they are not authenticated
Hybrid-ID users. Native admission remains the game's separate responsibility.

## Reference operations

- `POST /v1/matches`: create one immutable match using `request_id`.
- `POST /v1/matches/{match_id}/events`: append one ordered event batch using `batch_id`.
- `GET /v1/receipts/{request_id}`: recover the exact original accepted receipt.
- `GET /v1/status`: local reference availability; no account or write authority.

These paths are not part of Arena's production operation inventory. The receiver
must bind `127.0.0.1` and use disposable state. Hosted multi-tenant authority is M3.
Maximum body 256 KiB, 100 events per batch, 64 actors, 16 outcomes, depth 20.
These are reference bounds, not a production throughput/availability SLA.

## Canonical request bytes and signatures

Use UTF-8 JSON with no BOM/whitespace, ASCII object keys sorted lexicographically,
no escaped non-ASCII characters, and only safe integers (absolute value <=
9007199254740991). No floats, NaN, duplicate keys, undefined values or lone Unicode
surrogates. Strings use standard JSON escaping. Preserve the exact resulting bytes
in a durable outbox before network delivery.

Required headers are `X-Arena-Key-Id`, `X-Arena-Publisher`, `X-Arena-Environment`,
`X-Arena-Timestamp` (integer Unix seconds), `X-Arena-Nonce` (32 lowercase hex), and
`X-Arena-Signature` (64 lowercase hex HMAC-SHA256). Canonical signing text is:

```text
ARENA-GAME-HMAC-V1
UPPERCASE_METHOD
EXACT_PATH
PUBLISHER_ID
ENVIRONMENT
TIMESTAMP
NONCE
SHA256_OF_BODY_BYTES
```

Join with LF, no final LF. GET has an empty body hash. No query, redirect,
percent-encoded alternate path, browser cookie, Origin or bearer token is part of
this service protocol. The server resolves authority from its scoped key registry,
not publisher fields supplied by an unrecognized caller. Clock tolerance is
60 seconds; nonces are durable and expire after at least 120 seconds.

## Ordering, lifecycle and recovery

Every batch binds the registered publisher/game, immutable match/epoch, its
first sequence and previous accepted batch SHA-256 (null initially). Events have
contiguous sequences and nondecreasing simulation time/source ticks. Match start
occurs once. Score/game events require a live match. Completion/cancellation is
terminal and must be last in its batch; no later history is admitted. A source gap
creates a permanent hold; it is never silently healed or settled.

Commit the events, resulting state, stream cursor and receipt in one durable
transaction before acknowledging. Exact retries return the original receipt
even after restart, terminal state or a gap. Conflicting bytes for the same ID
return 409. Authenticate current scope before returning any historical receipt.
An unknown receipt or timeout does not authorize a new request ID or changed terms.
Always use a new nonce when retrying the original bytes.

## Assurance and financial boundary

The receipt binds the original request digest and local acceptance state. It is
not an independently signed game result or a chain receipt. It explicitly records
`assurance: local_reference_only`, `anchor: null`, `payout_authorized: false`.
No SDK method signs a transaction, allocates collateral or releases customer funds.
Future approved rule/settlement/wallet services consume evidence separately.

Public projection, retained replay data, source integrity review and credential
provisioning are explicit later capabilities. Publishing this schema does not
grant a game source an Arena identity, operator license or production write key.
