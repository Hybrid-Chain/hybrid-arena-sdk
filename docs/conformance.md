# Local alpha acceptance

Release: `v0.1.0-alpha.2`; contract: `2026-10-23.2`.

Local validation on Node 22.23.3 and Python 3.12 passed 24 Node tests and five
Python tests. CI additionally runs the same suite on Node 22 and 24. Check the
release's exact source revision and CI run before relying on a downloadable build.

Exercised cases include canonical signing, schema rejection, nonce/scope/clock
checks, revoked keys, immutable request IDs, atomic batch rejection, ordered
sequences and hash chains, held gaps, terminal states, four-outcome completion,
bounded retry delays and private persistent outboxes. After a committed response
was dropped, receiver restart and cross-language outbox recovery retained exactly
one match, three events and two receipts in both language directions.

The actual npm tarball and Python wheel were installed into clean environments.
The installed CLI and wheel exercised the same disposable loopback receiver and
recovered the same fixture receipts without adding matches or events.

These are synthetic, local protocol tests. Native CS2/Star Quest integration,
third-party game integrity, hosted registry/ingestion, multi-host availability,
chain publication and financial settlement are not certified by this release.
No production authority or payout capability is enabled.
