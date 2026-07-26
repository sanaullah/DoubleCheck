# DoubleCheck

**Local second pair of eyes** for **BoxLang**, **ColdFusion**, **JavaScript**, and **Java**.

Runs on your machine with SQLite — not SaaS, not hosted, not multi-tenant. A desktop helper beside Cursor (or similar): point at a repo, review with evidence, optional AI specialists when you want depth.

[![Local-first](https://img.shields.io/badge/local--first-SQLite-2ea44f)](#quick-start)
[![No login](https://img.shields.io/badge/auth-none-lightgrey)](#quick-start)
[![Languages](https://img.shields.io/badge/languages-BoxLang%20%7C%20CFML%20%7C%20JS%20%7C%20Java-0e7490)](#supported-languages)
[![AI optional](https://img.shields.io/badge/AI-optional-informational)](#configuration)

> Basic review works **without an AI key**. Deterministic checks always run; LLM specialists deepen selected areas when a provider is configured.

---

## What you get

1. **Evidence-backed local review** while you generate or refactor
2. **Legacy ColdFusion modernization assist** — guidance, not an auto-migrator
3. **Honest capability claims** — measured labels, one clear path per feature

---

## Product tour

### Workspace — start a review

Choose a folder, set depth and focus areas, keep the run **read-only**, then watch the command center through scan → architecture → specialists → validate.

![DoubleCheck workspace and review command center](resources/docs/images/01-workspace.png)

### Findings — inspect and act

Verified findings with severity, confidence, evidence snippets, and fix guidance. Export **Markdown**, **JSON**, or **SARIF**.

![Review findings with evidence and recommendations](resources/docs/images/02-findings.png)

### Architecture — explore the graph

For BoxLang projects, browse persisted symbols, dependencies, and impact paths from the run snapshot.

![BoxLang architecture explorer](resources/docs/images/03-architecture.png)

### Observability — follow the flight

Local traces for phases, specialist roles, generations, tool calls, and retries — useful when tuning models or debugging a run.

![Local observability trace workspace](resources/docs/images/04-observability.png)

---

## Supported languages

| Language | Status |
|---|---|
| BoxLang | Deepest — graph, architecture, measured tier |
| ColdFusion (CFML) | Review + LLM depth when an AI key is set |
| JavaScript | In scope; lighter depth today |
| Java | In scope; lighter depth today |

No other languages are product targets.

---

## Quick start

**Requirements:** [CommandBox](https://commandbox.ortusbooks.com/) 6+ and a BoxLang-capable server (runtime modules download on first start via `server.json`).

```powershell
box install
box run-script setup
# Optional — set OPENAI_API_KEY in .env for LLM specialists
box server start
```

`setup` only creates `.env` if missing. On first start the app creates the SQLite file and schema when needed.

Open the URL CommandBox prints (commonly `http://127.0.0.1:55452`).

| Resource | Path |
|---|---|
| API docs (Swagger UI) | `/apidocs/` |
| OpenAPI JSON | `/api/v1/openapi.json` |
| OpenAPI YAML | `/api/v1/openapi.yaml` |

```powershell
box testbox run
```

---

## Configuration

Copy [`.env.example`](.env.example). Important keys:

| Variable | Purpose |
|---|---|
| `DOUBLECHECK_DB_PATH` | SQLite path (default `./.db/doublecheck.db`) |
| `OPENAI_API_BASE` / `OPENAI_API_KEY` / `DEFAULT_MODEL` | LLM specialists (optional for basic review) |

Local-only: no auth, tenants, or hosted production mode.

---

## Layout

```text
app/                      ColdBox application
public/                   Web root + desktop UI
resources/database/       Migrations
resources/docs/images/    README screenshots
.db/                      SQLite (gitignored)
tests/                    TestBox
```

---

## Contributing

Prefer small, testable changes for **BoxLang, ColdFusion, JavaScript, or Java** only.

Do **not** add SaaS, hosted multi-tenant architecture, login walls, or mobile UI layouts.

Agent guidance: [`AGENTS.md`](AGENTS.md) and `.cursor/rules/`.
