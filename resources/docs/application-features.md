# DoubleCheck — application features

Committed product map for agents and developers: **why** Review, Modernize, and
CodeGraph exist, and **what ships today**. Install and quick start live in
[`readme.md`](../../readme.md). How the system is wired lives in
[`technical-flow.md`](technical-flow.md).

## The claim rule

Claims here must match measured behaviour in code and
`GET /api/v1/capabilities`.

**A capability that cannot be pointed at in the UI, an export, or an API
response does not get a feature row** — it goes in [Known gaps](#known-gaps), or
nowhere. A row here without visible output is a claim the product cannot back;
a shipped capability without a row is indistinguishable from one never built.

`resources/docs/` is the **single documentation source of truth**. There is no
`.docs/` tree — if you find one, it is stale and should be deleted rather than
read.

---

## What DoubleCheck is

DoubleCheck is a **local desktop** “second pair of eyes” for developers working
in **BoxLang**, **ColdFusion (CFML)**, and **JavaScript**. Analysis and SQLite
run on the developer’s machine. There is no SaaS console, no login wall, and no
multi-tenant hosting.

Point it at a repository, run a read-only review (or a CF Modernize proposal),
inspect evidence-backed results, and export them. Optional LLM specialists and
Modernize proposals deepen selected areas when a provider is configured.

| Language | Role today |
|---|---|
| BoxLang | Deepest path — parse graph, architecture, seeded evaluation corpus |
| ColdFusion (CFML) | Graph, architecture, deterministic rules without a key; LLM depth and Modernize when a provider is on |
| JavaScript | In scope; lighter depth than BoxLang |

No other languages are product targets.

---

## Four product purposes

1. **Evidence-backed local review** — deterministic checks always run; optional
   specialists deepen selected areas with authorized source evidence.
2. **Legacy ColdFusion modernization assist** — propose and validate a migration
   plan; **assist**, not an automatic migrator. Never writes application source
   or executes DDL.
3. **Interactive CodeGraph explorer** — deterministic BoxLang/CFML/JavaScript
   knowledge graph (roles, routes/resources, flows, paths, clusters) plus an LLM
   Domain lens for business meaning; not a findings or migration product.
4. **Honest capability claims** — measured labels, evidence validation, one clear
   path per feature. Prefer under-claiming over marketing language.

---

## Review — purpose

Use Review when you want a second pair of eyes on BoxLang, CFML, or JavaScript
while you generate or refactor.

**When to run**

| Mode | Use when |
|---|---|
| `full` (default) | Unfamiliar codebase, or no meaningful Git diff |
| `working-tree` | Local changes vs HEAD (save-triggered / day-to-day) |
| `revision-diff` | Compare two revisions |
| Fast create (`fast: true`) | Low-latency deterministic-only loop (e.g. `tools/watch-review.ps1`); skips crew planning and specialists |

Git scopes which files enter the run. The pipeline indexes **full file contents**,
not unified diff patches.

**Success looks like**

- Line-level findings with severity, confidence, evidence snippets, and guidance
- Architecture graph / facts when BoxLang or CFML sources exist
- Optional specialist deepening when AI is enabled
- Export to Markdown, JSON, or SARIF; baselines vs a prior compatible run

**Review does not**

- Modify the analyzed repository
- Auto-apply fixes or guarantee runtime correctness
- Replace hosted GitHub/GitLab PR review products
- Require an AI key for basic deterministic review

---

## Review — features today

| Area | What you get |
|---|---|
| Desktop workspace | `/review` UI; create run, SSE progress, cancel |
| Discovery | Working-tree / revision-diff / full scans with skip counts and truncation honesty |
| Deterministic findings | Rules without an AI key (secrets, language-scoped SQL/dynamic-code/empty-catch, CFML lifecycle and queryparam patterns, and related packs) |
| Architecture | BoxLang + CFML symbol/dependency graph; architecture explorer; optional AI fact enrichment with citation checks |
| Planning | Bounded role plan and context packs (`symbol-range-artifact-refs-v3`); deterministic `emphasizeFiles` when crew planning is off |
| Specialists | Allowlisted roles (security, correctness, architecture, testing, performance, boxlang-conventions, cfml-conventions); read-only tools; evidence-range validation |
| Bulk AI fallback | When a provider is enabled but the planner produced no specialist tasks, a bounded bulk review runs instead — AI findings appear with no specialist board (`AIReviewService`) |
| CFML LLM depth | `cfml-conventions` specialist depth when a provider is enabled (`specialistCfmlDepth=cfml-conventions-llm-v2`) |
| Fast mode | `fast: true` on run create skips crew planning and specialists for a low-latency save loop (`tools/watch-review.ps1`) |
| Solutions | Rule playbooks and optional evidence-matched fix patches |
| Trust | Fingerprints, secret redaction, finding baselines (new/unchanged/fixed on read) |
| Decisions | Per-finding review overlay on a run |
| History | Local history, comparison, rerun, Review-only follow-up |
| Export | Markdown / JSON / SARIF; `tools/ci-sarif.sh` for self-hosted CI |
| Observability | SSE events, event log, local Langfuse-style traces; optional `/aiflight` explorer |
| Quality gate | Corpus / tier status at `/api/v1/quality` |
| Workers | Registry at `/api/v1/workers`; runs recover after a restart |
| Contract versions | `schemaVersion` / `placementContractVersion` in `/api/v1/capabilities`; `provenanceClass` per item in exports |

Pipeline phases and HTTP routes: [`technical-flow.md`](technical-flow.md).

---

## Modernize — purpose

Use Modernize when you need a **proposal-only** CFML modernization plan:
inventory legacy units, optional schema evidence, coupling signals, and a
bounded roadmap toward a chosen target profile (BoxLang or Lucee-oriented).

**Requires** an enabled LLM provider (keyless local `ollama` / `docker`, or a
remote provider after explicit egress acknowledgement). Only bounded, redacted
context leaves the machine for remote providers.

**Success looks like**

- A versioned plan with coverage, validation, and human accept/reject decisions
- Clear labels when scan truncation or missing schema makes the plan
  inference-limited
- Continue / slice rebuild for partial work without widening scope

**Modernize does not**

- Rewrite application files
- Execute SQL / DDL against any database
- Guarantee runtime parity after migration
- Replace Review for day-to-day defect finding (baselines and follow-up stay Review-only)

---

## Modernize — features today

| Area | What you get |
|---|---|
| Workspace | `/modernize` UI on the same local run queue as Review (`runKind=modernize`) |
| Shared scan | Repository indexing with Modernize-oriented scan budgets; CFML prioritized |
| Inventory | Conservative CFML unit catalog and legacy evidence |
| Schema packs | Optional sanitized evidence (`sql-ddl`, `structured-json-v1`, `migration-folder`); no DDL execution |
| Signals / coverage | Deterministic coupling signals; honest repository/inventory/schema/LLM coverage |
| Context | Bounded partitions for application / database / roadmap roles |
| Proposal | Sharded LLM proposals merged into a versioned plan |
| Validation | Structure, evidence, and safety gates; optional repair of invalid items |
| Placement | Packaging suggestions: `main-app`, `coldbox-module`, `external-service` — grouping is folder-based today, see [Known gaps](#known-gaps) |
| Map | Modular Monolith Map: node/edge diagram with click-through to a slice |
| Risk / effort | Signal-weighted S/M/L/XL with named drivers, cross-referenced against this project's own review findings (UI only — see [Known gaps](#known-gaps)) |
| Target profiles | BoxLang (`boxlang`, `modern`) and Lucee (`modern`, `flat`) |
| Decisions | Accept / reject / clear per plan item; decision audit trail |
| Continue / rebuild | Continue partial runs; rebuild one roadmap phase or item (`sliceRebuild`) |
| Skills | Allowlisted installed skill packs (never skills from the analyzed project) |
| Export | Markdown / JSON / validation-oriented SARIF |

Stage wiring: [`technical-flow.md`](technical-flow.md). Service ownership:
[`app/models/README.md`](../../app/models/README.md).

---

## CodeGraph — purpose

Use CodeGraph when you want an interactive knowledge graph of a ColdFusion /
BoxLang / JavaScript repository: files, symbols, dependencies, clusters, cycles, hotspots,
file roles, and handler-seeded flows. Review and Modernize already compute parts
of this graph; CodeGraph turns it into an explorable workspace with a Domain
lens for strangers to the repo.

**Structure without an AI key** — indexing, metrics, clusters, roles, flows,
cycles, orphans, layer violations, hotspots, and drill-down all succeed
deterministically. Folder/cluster keys are evidence labels, not business domains.

**Meaning requires a configured provider** — domain names, process stories,
onboarding path, and risk briefing come from the LLM Domain lens
(`codegraph-narrative-v2`). Without AI, the UI shows *“Meaning layer
unavailable — configure an AI provider for domain and process briefing.”* The
run still completes; do not treat deterministic labels as business meaning.

**Success looks like**

- A persisted snapshot with nodes (with `role`), clusters, directories,
  reachability, extracted `flows`, cycles, orphans, layer violations, and hotspots
- Interactive drill-down (Overview → module/cluster files → neighbourhood subgraph)
- With AI: pitch, domain summaries, process stories, onboarding steps, and risk
  briefing — all citing computed ids; never altering deterministic metrics

**CodeGraph does not**

- Present business domains or process narratives without a successful LLM narrative
- Replace Review findings or Modernize migration proposals
- Mount its explorer inside Review or Modernize. Review and Modernize compute
  coupling signals and consume them in their own surfaces; the interactive canvas
  ships on `/codegraph` only. **This is a deliberate boundary, not a gap** —
  CodeGraph answers "what is this, and how does a request move" before work;
  Review answers "what did I miss" after it, and impact analysis stays Review's.
  A CodeGraph run reuses an index any run kind already built, and
  `/codegraph/subgraph` and `/codegraph/edges` serve any run with an indexed
  graph; `/codegraph/narrative` stays CodeGraph-only

---

## CodeGraph — features today

| Area | What you get |
|---|---|
| Workspace | `/codegraph` UI on the same local run queue (`runKind=codegraph`) |
| Arrival | Opening `/codegraph` loads the newest saved map for the project (`GET /api/v1/codegraph?projectPath=`) and leads with it; the map states when it was built and offers **Rebuild map**. A project with no snapshot yet still opens on the run form |
| Scan | BoxLang/CFML/JavaScript indexing (`cfc`/`cfm`/`bx`/`bxm`/`bxs`/`js`/`jsx`); bounded parser fallback is recorded |
| Graph | Symbols + dependencies, routes, views, tables, HTTP/schedule resources; coupling metrics reuse Modernize services |
| Roles | Per-node evidence-backed `entry` / `client` / `integration` / `orchestrator` / `domain` / `persistence` / `view` / `shared` / `test` legend, rendered from snapshot counts. Legend chips filter: one click dims every other role on the canvas and lists that role's files |
| Flows | Route- and browser-seeded bounded paths in snapshot `flows[]`; each hop names the **symbol that owns the edge** (`OrderHandler.index`) or says file level; one flow per (entry, sink) with `variantCount`, selected for sink coverage rather than path depth |
| Levels | The run is stored as rows in `codegraph_nodes` / `codegraph_edges` at `cluster` / `directory` / `file` / `symbol` / `resource` / `knowledge`, linked by `parentId`. `GET /codegraph/graph?level=&scope=` serves one level; `GET /codegraph/search?q=` finds nodes — including symbols — that the canvas never drew |
| Resources | Routes, tables, configuration keys, events and outbound integrations are their own level, not files. Each carries its participants: who declares a route and which handler serves it, who reads a table and who writes it, which files read a setting |
| Knowledge | With AI, domains, processes and risks are stored as nodes with `describes` / `affects` edges to the structure they explain, so "which risks touch this file" is a query. Every knowledge edge is marked `resolution: narrative`, `provenance: llm` — it is never evidence |
| Completeness | Every capped collection reports `{ returned, available, omitted, rankedBy, complete, state }`, plus `unresolved` (run-level, with `unresolvedScope`) and `unsupported` — the behaviour static analysis cannot prove. The UI prints the loaded/available counts and names any relationship kind that produced nothing. Node truncation keeps the most connected files, not the alphabetically first |
| Trace | Drawer tab: neighbours (what reaches this, what it reaches), type hierarchy, and table lineage by name. Each row carries kind, `file:line`, the source excerpt and a resolution badge, so a declaration and a name-match look different. Selecting a row moves the map |
| Assess | Drawer tab: depth-bounded change impact grouped by hop, and architecture rules with per-violation evidence |
| Query surface | `GET /codegraph/neighbours` (what calls this, what it calls), `/hierarchy` (extends / implements), `/lineage?table=` (readers and writers), `/impact?node=` (transitive callers, depth-bounded), `/onboarding` (where to start reading), `/diff?base=` (run over run), `/rules` (architecture fitness with violation evidence), `/mcp` (the same surface described as MCP tools) |
| Clusters | Weighted modularity clusters with cohesion and crossing edges |
| Issues | Cycles, orphans, layer violations, hotspot ranking, reachability gaps |
| Explorer | Hand-rolled SVG UMD (`codegraph-layout.js`); cluster / layer / swimlane / radial layouts; pan/zoom |
| Search / paths | Directory rollup + search; inspector start/end picker; bounded directed paths with hop evidence and graph highlighting via `/codegraph/paths` |
| Subgraph | `/codegraph/subgraph` neighbourhood drill-down and `/codegraph/edges` bounded edge slices |
| Domain lens | LLM narrative v2 (`CodeGraphNarrativeService`): pitch, domains, processes, onboarding, risk; no key → structure only + meaning banner |
| History | Dashboard filter + `/api/v1/history?runKind=codegraph` |
| Export | UI downloads plus local Markdown/JSON/Mermaid/SVG via `/api/v1/runs/:id/export`; no narrative still exports structure |
| Temporal signal | Optional local Git co-change affinity, bounded churn counts, cluster author count/last touch; non-Git runs stay structural-only |

---

## AI provider contract

| Setup | Review | Modernize | CodeGraph |
|---|---|---|---|
| **No** AI key / provider disabled | Yes — deterministic findings; graph/architecture when BX/CFML exist | No — provider required | Yes — structure (graph, roles, flows); meaning banner; no domain/process briefing |
| Enabled **local** keyless provider (`ollama` / `docker`) | Yes — specialists when enabled | Yes — subject to local provider availability | Yes — structure + Domain lens when narrative succeeds |
| Enabled **remote** provider | Yes — after normal provider config | Yes — after explicit remote-egress acknowledgement | Yes — structure + Domain lens when narrative succeeds |

- A key is **never** required for basic local Review or CodeGraph **structure**.
- Modernize always `requiresLlm: true` in capabilities.
- CodeGraph `requiresLlm: false` (run succeeds without AI); `meaningRequiresLlm: true`
  (domain/process briefing needs a provider).
- Provider profiles and app settings are managed locally (`/api/v1/ai-providers`,
  `/api/v1/app-settings`); API keys are not stored as review artifacts.

---

## Out of scope

Do not build or claim:

- Multi-tenant SaaS, cloud billing, login walls, or hosted retention
- API-key auth for everyday local use
- A hosted PR-bot platform replacing GitHub/GitLab
- Automated ColdFusion → BoxLang migration (file writes / DDL)
- Languages outside BoxLang, ColdFusion, and JavaScript
- Mobile / phone UI layouts or responsive redesigns

`prefers-reduced-motion` and ordinary desktop accessibility remain in scope.

---

## Known gaps

Verified against code, not suspected. Tracked here rather than quietly, per the
claim rule. Historical Modernize inversion notes remain in
[`plans/modernize-inversion-plan.md`](plans/modernize-inversion-plan.md). The live
CodeGraph plan is
[`plans/codegraph-remediation-plan.md`](plans/codegraph-remediation-plan.md);
its §2 carries the measured baseline and §4 the verified defect register.

### Capability limits — the output is thinner than the feature row implies

| Gap | Detail | Fixed in |
|---|---|---|
| Grouping is folder-shaped, not coupling-shaped | Placement clustering keys on scope paths and folder inference, not a dependency graph | Steps 1–2 |
| Small repositories get one cluster | Below `minUnitsForFolderInference` every unit lands in a single `ctx-modular-monolith-default` placement — a small repo gets no seams at all | Steps 1–2 |
| Map edges are proposed groupings | The Modular Monolith Map is drawn from `target.contexts` / `target.extracts`, not computed dependencies. The picture is real; what it depicts is an assertion | Steps 1–3 |
| Roadmap is a chain, not a DAG | Phase `dependencies` are assigned in shard-arrival order, so the sequence is not derived from what actually blocks what | Step 2 |
| Every side-app candidate defers to the user | `external-service` placements always return `decisionRequired`, several gates `unknown`. Deliberate conservatism, but the product declines to answer its headline question | Step 8 |

### Defects

| Gap | Detail | Fixed in |
|---|---|---|
| Decisions can spuriously conflict | Two divergent copies of the fingerprint-exclusion list mean placement canonicalization and gate evaluation hash the same item differently. Users see *"the modernization proposal changed; refresh before deciding"* on an item that did not change | Step 0 |

### Visibility — computed but not surfaced

| Gap | Detail | Fixed in |
|---|---|---|
| ~~Risk / effort not exported~~ **closed** | `riskLevel`, `effortSize`, `effortDrivers` and `relatedFindingCount` now appear in the Markdown export's placement register, with a spec asserting the columns are present | Step 7 |
| Export leads with telemetry | The Markdown export opens with run metadata and 13 lines of coverage counters — including provider shard counts — before any finding | Step 7 |

### Measurement

| Gap | Detail | Fixed in |
|---|---|---|
| No Modernize evaluation corpus | Review has a scored corpus with precision/recall/F1 thresholds; Modernize has unit fixtures only, so its quality is unmeasured — and the CFML tier cannot rise without one | Steps 2a, 6 |
| ~~No CodeGraph evaluation corpus~~ **closed** | Source-backed `resources/evaluation-corpus/codegraph-v1` scores expected routes, tables, flows, bounded paths, and stable deterministic domain labels through `tests/specs/integration/CodeGraphCorpusSpec.bx`; it does not promote a language tier | Step 17 |
| ~~JS tests are ungated~~ **closed** | `tests/js/*.spec.mjs` runs via `box.json` `scripts.test` / `box run-script test` (`node --test tests/js/*.spec.mjs`) | — |

---

## Measured language tiers

Tiers are **earned, not declared**. `QualityGateService.advertisedLanguages()`
reports `measured: true` only when the seeded evaluation corpus has run and
passed; otherwise it reports the registry default with `measured: false`.

| Language | Registry default | Promoted to | On what |
|---|---|---|---|
| BoxLang | `unverified` | `parsed-dependency-aware` | `resources/evaluation-corpus/v1` passing its precision / recall / F1 / citation thresholds |
| ColdFusion | `discovery-only` | — | **graph** structure is now scored by `codegraph-v1/cases/cfml-invoice-flow` (routes, renders, table read/write, full route→table path). That corpus deliberately does not promote a tier: the review corpus is what promotes, and ColdFusion still has none |
| JavaScript | `discovery-only` | — | participates in both CodeGraph corpus cases through the `fetch` → route → handler → table path; no review corpus |

**Hierarchy is scored, not assumed.** Both cases declare a supertype and an
interface, because `extends` and `implements` are 0 on DoubleCheck itself — it
inherits only from framework classes — and correct-and-empty is indistinguishable
from broken. Adding them found that CFML produced no symbol for `interface`
declarations at all, so `implements` could never resolve in a ColdFusion project.

**What the CodeGraph corpus found.** It was added because self-analysis on a
BoxLang repository cannot show that ColdFusion produces a weaker graph. On its
first run it showed exactly that: `routes` and `renders` could never fire — a
literal backspace byte sat where `` was intended in both patterns — and table
access never split into reads and writes, so `/lineage` could not say who writes
a table in a ColdFusion project. All three are fixed and scored.

Do not raise a tier here by intention. Add a corpus, run the gate, and let the
promotion happen — the `measured` flag is what makes the claim honest.

---

## Where to go next

| Need | Open |
|---|---|
| Install / config | [`readme.md`](../../readme.md) |
| How Review / Modernize / CodeGraph are wired | [`technical-flow.md`](technical-flow.md) |
| CodeGraph plan (live; baseline + defect register) | [`plans/codegraph-remediation-plan.md`](plans/codegraph-remediation-plan.md) |
| Prior Modernize inversion notes | [`plans/modernize-inversion-plan.md`](plans/modernize-inversion-plan.md) |
| Open issues | [`open-issues.md`](open-issues.md) |
| Prompt contract system | [`prompt-system.md`](prompt-system.md) |
| Service and repository ownership | [`app/models/README.md`](../../app/models/README.md) |
| HTTP contract | [`resources/apidocs/openapi.yaml`](../apidocs/openapi.yaml) |
| Agent working rules | [`AGENTS.md`](../../AGENTS.md) |
