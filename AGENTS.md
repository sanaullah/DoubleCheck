# DoubleCheck Agent Guide

DoubleCheck is a local desktop “second pair of eyes” for developers working in
BoxLang, ColdFusion, and JavaScript. Keep changes focused on that product.

## Source of Truth

**`resources/docs/` is the single documentation source of truth.**

Read only what the task needs:

1. `readme.md` for product scope, setup, and supported languages.
2. `resources/docs/application-features.md` for purpose, shipped features, the
	 AI contract, out of scope, **known gaps**, and measured language tiers.
3. `resources/docs/technical-flow.md` for the technical map (review / modernize
	 pipelines, HTTP surface, bootstrap).
4. The relevant code and tests (`app/models/README.md` when changing model-layer
	 ownership or public APIs).
5. `resources/docs/plans/modernize-inversion-plan.md` when doing Modernize work.
	 Its Part 2 is a verified evidence base — every claim carries a `file:line`.
	 Execute Part 4 in the order given by its execution graph, not document order.

Narrower reference, load only when the task needs it:
`prompt-system.md`, `cfml-llm-depth.md`, `boxlang-conventions.md`,
`testing-commands.md`, `open-issues.md`.

Do not invent product claims when the README and code do not support them. A
capability that cannot be pointed at in the UI, an export, or an API response
does not get a feature row — it goes in Known gaps, or nowhere.

**One live plan at a time.** When a plan is superseded, delete it — do not
archive "just in case". A superseded document that stays readable will be read.

Framework reference material and implementation skills live under `.agents/`.
Load a specific guideline or skill only when the task requires it; do not treat
the generated catalogs as project requirements.

When reporting information to me, be extremely concise and sacrifice grammar for sake of concision.

## Hard Product Boundaries

- Local-only application; SQLite and analysis run on the user's machine.
- Desktop-only workspace; narrow-window breakage is preferable to a separate
	mobile experience.
- Supported languages are BoxLang, ColdFusion, and JavaScript only.
- Basic review must work without an AI key. LLM specialists are optional.
- This is a review and modernization assistant, not an automatic migrator.
- Capability claims must reflect behavior that exists and is measured.

Do not add:

- SaaS or hosted multi-tenant architecture
- accounts, login walls, tenant auth, billing, quotas, or hosted retention
- a hosted PR-bot platform
- mobile navigation, phone layouts, or responsive breakpoint redesigns
- support claims or feature work for other programming languages
- speculative framework layers, future “phases,” or duplicate product paths

`prefers-reduced-motion` and ordinary desktop accessibility improvements remain
in scope.

## Architecture

- `app/` — ColdBox application code
- `app/handlers/` — HTTP handlers and versioned `/api/v1/*` endpoints
- `app/models/services/` — review runs, findings, parsers, graph and architecture
	analysis, planners, specialists, and quality gates
- `app/config/` — ColdBox configuration and routes
- `public/` — web root and desktop UI
- `resources/apidocs/` — OpenAPI source
- `resources/docs/` — committed product and technical docs
- `tests/` — TestBox suites

The database path comes from `DOUBLECHECK_DB_PATH` and defaults to
`./.db/doublecheck.db`. `Setup.bx` creates `.env` only when it is missing.
`SchemaService` owns the complete SQLite schema and creates or repairs it on
start when needed. There is no `resources/database/migrations/` path.

Keep application code outside the public web root. Preserve the modern
`app/`/`public/` separation and the mappings and aliases in `server.json`.

## Implementation Rules

- Prefer the smallest change that completes the requested behavior.
- Extend the existing service, handler, view, and test patterns before creating
	new abstractions.
- Keep one clear implementation path per feature; remove or avoid parallel
	legacy paths when safe and within scope.
- Base UI work on the existing wide desktop composition. Do not add
	`@media (max-width: ...)` rules to restack it for phones or tablets.
- Use `prc` for internal request data and `rc` only for user input. Validate
	untrusted `rc` values.
- Use dependency injection rather than manually resolving services.
- Keep API changes under `/api/v1/*` and update OpenAPI material when the
	contract changes.
- Change the local SQLite schema in `SchemaService` (single source of truth).
	Do not reintroduce CommandBox/cfmigrations under `resources/database/`.
	Do not commit local database files, secrets, generated runtime state, or
	`.env`.
- Preserve basic non-LLM behavior when adding or changing AI-assisted features.
- Follow nearby BoxLang/CFML formatting and naming rather than applying a broad
	unrelated rewrite.
- Prefer `import java:` / `new java:` over `createObject( "java", ... )`. Because
	BoxLang is case-insensitive, do not name a variable the same as an imported
	class short name (e.g. after `import java:java.io.File`, avoid `file` /
	`File`). See `.cursor/rules/boxlang-java-interop.mdc`.

## Verification

Use the narrowest useful check during development, then run the relevant suite.
Common commands:

```powershell
box install
box run-script setup
box server start
box testbox run
box run-script format
```

Do not overwrite an existing `.env`. Before handing off:

- test changed behavior and important failure paths
- confirm local-only and no-key behavior still works where affected
- update tests and API documentation when behavior or contracts change
- report checks that were run and any checks that could not be run

Do not run `coldbox ai refresh` merely to update this file. `AGENTS.md` is
deliberately maintained as concise project guidance; generated framework
inventories belong under `.agents/`.