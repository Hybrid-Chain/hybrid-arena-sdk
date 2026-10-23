# Compatibility mappings

The common envelope is additive. No existing CS2/Star Quest source payload or
signature changes as a result of publishing this contract. These mappings are
design/fixture acceptance, not deployed producer migrations.

| Common concept | Star Quest | CS2 |
| --- | --- | --- |
| Game/release/ruleset | Registered source release and mode rule | Registered bridge/game-plugin release and exact format |
| Match/epoch/sequence | Stable match, observed stream and source cursor | Arena allocation match, epoch and accepted source sequence |
| Outcomes | Four house IDs | Two immutable roster-team IDs; side switches do not change outcome identity |
| Actor | Opaque match-local reference when source supplies one | Match-local actor derived privately from the consented roster |
| Start | Source-authoritative game start | Accepted signed match_started after Arena's dispatched start |
| Game event | Namespaced elimination, objective, base or score fact | Namespaced kill, damage, round, bomb or MVP fact |
| Complete | Source result and winner/draw | Provider final scores/result with exact roster/rules version |
| Gap/recovery | Preserve missing observation/stream limitations | Preserve signed cursor/receipt recovery and permanent gap holds |

`occurred_at` is omitted unless the source actually provides a wall-clock event
time. An HTTPS observation time does not become a source occurrence time.
Source ticks and simulation milliseconds preserve their reported precision.
Player names, Steam IDs, session subjects and connection addresses are not common
public actor fields. Arbitrary extension values are private local evidence until
an explicit game-specific public projection is reviewed.

The fixtures illustrate two- and four-outcome envelopes. They do not assert that
real players, a source deployment or a native match passed this contract.
