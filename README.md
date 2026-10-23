# Hybrid Arena SDK

Open game-provider contracts and server-side tools for integrating games with
Hybrid Arena. MIT licensed. This repository is the common-contract source for
future third-party integrations; existing CS2 and Star Quest protocols are preserved.

**Early preview:** the common contract is published for evaluation. The runnable
SDK and loopback reference sandbox follow in milestone M2. Generic production
ingestion, Studio publishing, chain publication and payouts are not activated by
this contract. No package-registry publication is claimed.

## Contract first

- [Protocol and recovery](contracts/game-provider-v1/README.md)
- [JSON schemas](contracts/game-provider-v1/schemas.json)
- [Reference OpenAPI](contracts/game-provider-v1/openapi.json)
- [Existing-game mappings](docs/game-mappings.md)
- [Agent instructions](docs/AGENT-HANDOFF.md)
- [Delivery status](docs/milestones.md)

Validate the contract locally with Node 22.13+ (Node 24 used in CI):

```sh
npm ci
npm run test:contracts
```

The reference HTTP paths belong to the local sandbox. They are not newly deployed
routes at `hybrid-arena.com`. Arena's current production operations are documented
at https://hybrid-arena.com/api/openapi.json and its capability manifest at
https://hybrid-arena.com/.well-known/arena.json.

Browser sign-in, source delivery credentials, match admission and wallet execution
have different authorities. A game source cannot grant itself any of them.
