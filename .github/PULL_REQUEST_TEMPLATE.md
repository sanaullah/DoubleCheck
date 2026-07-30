## What changed

<!-- One or two sentences: what changed and why. -->

## Scope check

- [ ] Stays within DoubleCheck's product scope (local-only, desktop-only,
      BoxLang/ColdFusion/JavaScript/Java only — see `AGENTS.md`)
- [ ] No new SaaS/hosted/multi-tenant/login-wall surface area
- [ ] API changes (if any) stay under `/api/v1/*` and update both
      `resources/apidocs/openapi.yaml` and `openapi.json`
- [ ] Schema changes (if any) use a migration under `resources/database/migrations/`

## Testing

<!-- Commands you ran, e.g. `box testbox run bundles=tests.specs.unit.YourSpec` -->

- [ ] `box testbox run` passes locally
- [ ] Basic (no-AI-key) review still works, if this touches review/AI code paths

## Docs

- [ ] Updated `.docs/PRODUCT.md` if a capability's status changed
- [ ] Updated `readme.md` if install/usage instructions changed
