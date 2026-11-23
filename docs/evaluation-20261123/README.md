# Retained original-match evaluation — November23

Status: tested operator tool and declared selection protocol; real-data evaluation
has not yet been run at this source checkpoint. This is not a new SDK package or
live model release. Alpha.9 and the canonical model/policy/evaluator remain unchanged.

`tools/evaluation/arena-retained-originals.mjs` is an **operator-only offline tool**
for Arena's existing retained public-safe game/model tables. It is not a public
partner API, browser SDK capability or account database permission. It opens an
operator-owned regular SQLite file read-only and queries only model observations,
model heads and public match projections, never account/session/identity tables.
The caller must already have appropriate local filesystem authority.

The [selection protocol](selection-protocol.json) is committed before the real-data
run: latest400unheld completed match candidates, original first-observation ordering,
80/20chronological complete-match split before validation, no replacement of rejected
candidates, at most40uniformly selected original frames per match, first original
per repeated tick, and original completed features agreeing with the retained
source result. Unknown/missing/changed originals are excluded and counted; no
terminal or observation is synthesized. Every original canonical hash and stored
model output is checked. The original evaluator applies equal-match weighting and
explicitly excludes draws/awaiting-result observations from its metrics.

```sh
node tools/evaluation/arena-retained-originals.mjs /private/original.sqlite /private/new-report-directory
```

The output parent must be private and operator-owned. The dataset/report/selection
files are owner-only and exclusively created. Existing reports are not overwritten.
Keep raw datasets private; only aggregate reports/provenance belong in this public
repository. Input hashes are reproducibility commitments, not source authentication.
No source key, API call, model fit, model selection, journal reset, live quote/order,
settlement, wallet instruction, funding or service restart occurs.

Tests cover exact original feature retention and database-byte preservation,
private-table exclusion, changed estimates/held or conflicting terminals, fixed
held-out membership after rejection, repeated ticks, private output and refusal
to overwrite. The original evaluator/model regressions remain in place.
A real-data report still does not establish independent governance, calibration,
anti-cheat, human adoption, market liquidity, native finality or financial readiness.

Validation before real-data evaluation: TypeScript build passed; all59SDKNode tests
and5Python tests passed in a child-only loopback network namespace with disposable
RAM-backed temporary storage. Focused model/evaluation runs overlap the full59and
are not additional passes. Fixture authority is synthetic; no real user, financial,
provider or native-chain acceptance is inferred. Host mounts were restored.
