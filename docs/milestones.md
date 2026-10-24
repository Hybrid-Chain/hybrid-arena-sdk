# Milestone status

| Milestone | Status | Evidence |
| --- | --- | --- |
| M1 common contract | Contract preview complete | Versioned schemas, reference OpenAPI, mappings, signing vectors and valid/invalid fixtures pass local validation. Hosted deployment remains M3. |
| M2 SDK / CLI / conformance | Local alpha available | TypeScript/Python clients, shared durable outbox, schema validation, bounded retries, CLI and loopback receiver; lost-response/restart recovery passes in both language directions. See tagged release and CI for acceptance evidence. |
| M3 generic hosted sandbox | Deployed sandbox; controlled synthetic acceptance | Owned registry, revocable keys, hosted Node/Python receipts, backup/isolated restore and actual native Testnet verification. See deployment evidence; runtime status governs current availability. |
| M4 Arena Studio | Deployed developer preview | Studio roles/releases, complete-evidence Testnet publishing, external launch, feedback and release-bound votes with audited reviewer override. Mainnet adapter and independent creator acceptance remain outstanding. |
| M5/M6/M8 developer-practice slices | Deployed separate sandbox beta | Versioned outcomes, finite durable test-unit markets and simulated creator statements. Existing exchange/native admission and actual wallet/creator payments remain gated. |
| M7/M9/M10 and commercial activation | Outstanding | Wallet execution, approved operating routes and independent creator/player acceptance remain separate. |

The local kit never creates a hosted match. Hosted writes require explicitly issued Studio authority. The SDK has no game
allocation, real-player identity admission, financial ledger or wallet credentials.
The full platform roadmap is in the Arena website repository at
`docs/arena-developer-platform-strategy.md`.

CP1–CP6 are tracked in Arena `docs/creator-platform-six-milestones.md`. The complete reference game is `examples/signal-rush`; `arena starter` generates editable files. Canonical guide: https://hybrid-arena.com/integrations/games/creator-platform-v1/README.md . Source-only SDK keys never authorize browser simulation, wallet or Mainnet submission.
