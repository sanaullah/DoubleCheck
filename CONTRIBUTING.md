# Contributing to DoubleCheck

DoubleCheck is a local, open-source code review and legacy-modernization
assistant for **BoxLang, ColdFusion, JavaScript, and Java only**. Contributions
that stay inside that scope are welcome.

## Before you start

Read [`AGENTS.md`](AGENTS.md) first — it is the concise, binding project guide
(architecture, hard product boundaries, implementation rules). It applies to
human contributors the same way it applies to AI coding agents. In short:

- Local-only, desktop-only. No SaaS, hosted, multi-tenant, or login-wall work.
- No new supported languages beyond the four above.
- Prefer the smallest change that completes the requested behavior; extend
  existing service/handler/view/test patterns rather than inventing new ones.

If a change would add SaaS/hosted/mobile surface area, it will not be
accepted — please open an issue to discuss instead of a PR.

## Setup

```powershell
box install
box run-script setup
box server start --console
```

See [`readme.md`](readme.md) for the no-CommandBox standalone path
(`startup.bat` / `startup.sh`).

## Making a change

1. Keep API changes under `/api/v1/*` and update `resources/apidocs/openapi.yaml`
   **and** `openapi.json` together when the contract changes.
2. Use migrations (`resources/database/migrations/`) for schema changes.
   Never commit `.env`, local database files, or other generated runtime state.
3. Follow nearby BoxLang/CFML formatting and naming rather than a broad
   unrelated rewrite.
4. Add or update tests under `tests/specs/unit` or `tests/specs/integration`
   for the behavior you changed.

## Testing

```powershell
box server start --console
box testbox run
```

Narrow a run to one bundle while iterating:

```powershell
box testbox run bundles=tests.specs.unit.YourSpec
```

`box testbox run` needs a running server bound to the project (`box server
start`) — running it with no server available will fail with a runner-URL
error.

## Submitting a pull request

- Keep PRs focused; small and testable beats large and mixed-purpose.
- Describe what changed and why, and which checks you ran.
- Update `.docs/PRODUCT.md` when a capability's status changes, and
  `readme.md` when install/usage instructions change (see the "Docs hygiene"
  notes in `AGENTS.md`).

## Reporting bugs / requesting features

Use [GitHub Issues](https://github.com/sanaullah/DoubleCheck/issues). Include
your OS, whether you're running via CommandBox or the standalone launcher,
and steps to reproduce.
