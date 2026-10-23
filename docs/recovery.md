# Original-request recovery

The outbox binds a private SQLite file to origin, publisher, game and sandbox
environment. Each request keeps its method/path, ID, exact canonical body and
digest. Credentials stay in client configuration and are not written to the
outbox. Store the database in its owner-only directory and retain it over restarts.

1. Queue a match or event batch before transport.
2. `deliver` commits an attempt marker before issuing the HTTP request.
3. If the reply is lost, keep the same row and original terms.
4. On the next attempt the client first requests the original receipt.
5. If the receipt is unknown, resend the original bytes/ID with a fresh nonce.
   A 404 does not establish cancellation or authorize replacement work.
6. Validate the receipt schema, request digest, match/epoch, scope and sequences,
   then retain the receipt. An invalid receipt leaves the request unresolved.

The receiver atomically commits facts, cursor, lifecycle and receipt. Exact
original retries return that receipt after restart, completion or a source gap.
Changed bytes conflict. Fresh scope authentication is always required, including
receipt reads after revocation. Gaps and conflicting histories are not healed by
changing IDs or sequence numbers. A held match remains held in the reference kit.

`flush` stops at the first failure. There is no automatic daemon and no background
submission triggered by a read. Explicit retry helpers use bounded attempts,
jitter and Retry-After. Permanent 4xx failures need investigation; keep original
records instead of changing their terms in place.

Node and Python tests drop a response after the database commit, restart the
receiver, reopen the same outbox using the other language and recover the exact
receipt with one match, three events and two receipts. This is local protocol
acceptance with synthetic facts. It does not establish distributed availability,
native gameplay admission, anti-cheat quality, chain finality or financial payout.
