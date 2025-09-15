# Task: Upgrade @clerk/backend to v2.x

Context
- Current version: 1.x in apps/gateway-nestjs
- Goal: Evaluate and migrate to @clerk/backend v2.x safely.

Acceptance Criteria
- Read and summarize the v2.x changelog and migration guide.
- Identify any verification option changes (e.g., verifyToken parameters: jwtKey vs issuer/JWKS vs secretKey fallback).
- Update `src/modules/auth/clerk-integration.service.ts` accordingly (prefer stateless verification via public key or JWKS; keep secretKey fallback).
- Run unit tests and e2e (CI) — all green.
- Update docs: `CLERK_INTEGRATION.md` and gateway README if the options/usage change.

Implementation Notes
- Consider supporting JWKS: pass `issuer` and use built-in JWKS handling if provided by v2 API, else keep using `jwtKey` PEM.
- Maintain the `verifyFn` wrapper for testability.
- Keep public API (guards/controllers) unchanged.

Out of Scope
- Frontend SDK changes — FE remains @clerk/clerk-react.

Estimate
- S: 2–4 hours including docs and CI.
