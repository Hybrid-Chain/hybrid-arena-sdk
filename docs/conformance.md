# Local alpha acceptance

Release: `v0.1.0-alpha.4`; contract: `2026-10-23.2`.

Local validation on Node 22.23.3 and Python 3.12 passed 27 Node tests and five
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

## Creator reference and hosted commissioning

Signal Rush tests its server-owned clock/cooldown, deterministic labeled bot, match-bound input recovery, source response loss, restart and terminal facts. An actual npm artifact was clean-installed into an editable starter; the installed Python alpha.4 wheel passed five tests. Node22/24 CI is green for616b9c3.

On Arena23db9a6, the packaged authoritative server delivered175 synthetic events and three receipts through public HTTPS. Four templates resolved, four separate test-unit markets settled and four simulated statements reconciled. Native height1530, public source openings, decision replay, revocation and isolated restore passed. Current public summary: https://hybrid-arena.com/integrations/games/creator-platform-v1/deployment.json . It contains allowlisted aggregate results and public proof references only.

Hosted lab mutations use an explicit service-owned operator store; compiled browser tests use disposable synthetic sessions. This does not certify independent creators, human trading, anti-cheat, native trade admission, creator payments or Mainnet deployment.
