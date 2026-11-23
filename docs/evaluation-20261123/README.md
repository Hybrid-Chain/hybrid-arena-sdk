# Retained original-match evaluation — November23

Status: **first retained real-source chronological evaluation completed on Core**
using source `96c130266925e5f1d3dc9bb1cf0ccf9947f109ee`. The selection protocol was
pushed before the run. Alpha.9 and canonical model/policy/evaluator artifacts are
unchanged; this is not a package publication, parameter fit or live model release.

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


## First actual-source result

The operator tool read236,330original stored model rows from the400preselected
completed source matches. All400retained candidates passed the original feature,
clock, source-result and pinned-estimate checks; none was replaced or excluded.
The first320chronological matches were development-only; the final80were held out.
Each match contributed40original frames, so evaluation used3200frames with equal
match weighting. There were no drawn or awaiting-result frames in this cohort.
The underlying retained source inventory had480,990observations across856matches;
this report covers the declared400candidate subset, not that entire population.

| Held-out cohort | Matches | Brier score | Log loss |
|---|---:|---:|---:|
| All modes | 80 | 0.485809 | 0.866060 |
| Battlefield | 50 | 0.495365 | 0.858734 |
| Bombing | 13 | 0.546951 | 0.997278 |
| Capture | 8 | 0.156549 | 0.349078 |
| Transport | 9 | 0.637076 | 1.176763 |
| Equal-prior baseline | — | 0.750000 | 1.386294 |

Lower scores are better. The fixed model beat equal priors on this source cohort;
this is neither universal forecasting accuracy nor calibration certification.
Per-mode counts are small, especially Capture and Transport. Matches were supplied
by the same retained source system; independent human participation and source
truth/anti-cheat have not been established. These are real retained source matches,
not the synthetic unit fixtures, but no independent human acceptance is inferred.
Sampling is uniform over retained observation indexes, not a guarantee of uniformly
spaced physical gameplay. The development subset was not used to fit anything.

Calibration buckets remain descriptive and show deviations between forecasts and
observed outcome fractions. The report retains `calibrated:false`,
`source_authenticity_verified:false`, `parameter_fit_performed:false`,
`executable_quote:false` and `financial_execution:false`. Do not use this evaluation
mode in a live request or change the frozen model hash on the strength of this run.
A future model revision needs a separately predeclared training/evaluation process
and fresh unseen matches, rather than repeated selection against these80labels.

Artifacts: [report](report.json), [selection](selection.json),
[provenance](provenance.json), and the pre-run [protocol](selection-protocol.json).
The exact dataset and original-row commitments are recorded there. Raw datasets
remain owner-only on Core; they were not exported or committed. Seven critical
service identities stayed unchanged; no private account/session table, source key,
model selection, service, database content, order, financial gate or wallet was
changed. The operator ran in a child-only network namespace with global fetch
denied. This delivery advances M5; it does not complete M6/M8/M9/M11/M12.
