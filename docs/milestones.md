# Milestone status

| Milestone | Status | Evidence |
| --- | --- | --- |
| M1 common contract | Contract preview complete | Versioned schemas, reference OpenAPI, mappings, signing vectors and valid/invalid fixtures pass local validation. Hosted deployment remains M3. |
| M2 SDK / CLI / conformance | Local alpha available | TypeScript/Python clients, shared durable outbox, schema validation, bounded retries, CLI and loopback receiver; lost-response/restart recovery passes in both language directions. See tagged release and CI for acceptance evidence. |
| M3 generic hosted sandbox | Hosted client available; runtime status governs activation | Studio registry and scoped hosted delivery use the same contract. Check `/v1/status`, Arena deployment evidence and Explorer acceptance. |
| M4 Arena Studio | Developer preview rollout | Self-service Testnet registration, feedback, votes and reviewed promotion. Mainnet application deployment remains gated. |
| M5-M10 | Planned | Reviewed outcomes, markets, wallet execution, creator accounting and operator/public rollout |

The local kit never creates a hosted match. Hosted writes require explicitly issued Studio authority. The SDK has no game
allocation, real-player identity admission, financial ledger or wallet credentials.
The full platform roadmap is in the Arena website repository at
`docs/arena-developer-platform-strategy.md`.
