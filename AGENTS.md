# Hybrid Arena SDK

- This public repository contains contracts, SDKs and a local reference sandbox.
  Never commit private configuration, credentials, player data or runtime stores.
- Keep `contracts/game-provider-v1/` canonical; generate the website mirror and
  checksums from committed bytes. Preserve existing Star Quest and CS2 protocols.
- Client-side game code has no source-signing or payout authority. A receipt
  proves local protocol acceptance, not a verified game result, chain anchor or
  authorized payout. No money-moving endpoint is part of this SDK release.
- Keep original request IDs, canonical bytes and destination binding across
  failures/restarts. Retries use fresh nonces; never retry with changed terms.
- Tests use fixture authority, loopback and disposable databases only. Run
  TypeScript build, Node tests and Python tests before releases. Reference server
  always binds loopback. Published docs must accurately state deployment status.
- The intentionally public `demo-key` / repeated-byte secret and synthetic
  participant IDs are fixture authority, never provisioned on a live service.
- Use US English. SDK packages, schemas, examples, agent context and release
  manifests must agree on contract version and artifact checksums.
