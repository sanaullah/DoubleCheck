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
3. **Interactive CodeGraph explorer** — deterministic CF/BoxLang knowledge graph
   with optional AI summaries; not a findings or migration product.
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
BoxLang repository: files, symbols, dependencies, clusters, cycles, and
hotspots. Review and Modernize already compute parts of this graph; CodeGraph
turns it into an explorable workspace.

**Does not require** an AI key — the graph is deterministic. A configured
provider optionally adds plain-English cluster/hotspot summaries, clearly marked
as AI and toggleable in the UI.

**Success looks like**

- A persisted snapshot with nodes, clusters, cycles, orphans, layer violations,
  and hotspots
- Interactive drill-down (cluster → files → neighbourhood subgraph)
- Optional AI summaries that never alter deterministic metrics

**CodeGraph does not**

- Analyze JavaScript (JS files are skipped silently)
- Export Markdown/JSON/SARIF yet (`export` returns 422)
- Replace Review findings or Modernize migration proposals

---

## CodeGraph — features today

| Area | What you get |
|---|---|
| Workspace | `/codegraph` UI on the same local run queue (`runKind=codegraph`) |
| Scan | CF/BoxLang-only indexing (`cfc`/`cfm`/`bx`/`bxm`/`bxs`); JS → skipped.unsupported |
| Graph | Symbols + dependencies via existing parsers; coupling metrics reuse Modernize services |
| Clusters | Weighted modularity clusters with cohesion and crossing edges |
| Issues | Cycles, orphans, layer violations, hotspot ranking |
| Explorer | Hand-rolled SVG UMD (`codegraph-layout.js`); cluster / layer / radial layouts; pan/zoom |
| Subgraph | `GET /api/v1/runs/:id/codegraph/subgraph` neighbourhood drill-down |
| Narrative | Optional LLM summaries (`CodeGraphNarrativeService`); no key → graph still succeeds |
| History | Dashboard filter + `/api/v1/history?runKind=codegraph` |
| Export | Not available yet — API returns 422 `export_unsupported` |

---

## AI provider contract

| Setup | Review | Modernize | CodeGraph |
|---|---|---|---|
| **No** AI key / provider disabled | Yes — deterministic findings; graph/architecture when BX/CFML exist | No — provider required | Yes — full deterministic graph; no AI summaries |
| Enabled **local** keyless provider (`ollama` / `docker`) | Yes — specialists when enabled | Yes — subject to local provider availability | Yes — optional narrative summaries |
| Enabled **remote** provider | Yes — after normal provider config | Yes — after explicit remote-egress acknowledgement | Yes — optional narrative summaries |

- A key is **never** required for basic local Review or CodeGraph.
- Modernize always `requiresLlm: true` in capabilities.
- CodeGraph `requiresLlm: false`; narrative is additive.
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
[`plans/modernize-inversion-plan.md`](plans/modernize-inversion-plan.md). Active
implementation work is [`plans/codegraph-plan.md`](plans/codegraph-plan.md).

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
| Coupling graph UI is CodeGraph-only | Review/Modernize still compute coupling signals; the interactive explorer ships on `/codegraph` only | CodeGraph |

### Measurement

| Gap | Detail | Fixed in |
|---|---|---|
| No Modernize evaluation corpus | Review has a scored corpus with precision/recall/F1 thresholds; Modernize has unit fixtures only, so its quality is unmeasured — and the CFML tier cannot rise without one | Steps 2a, 6 |
| No CodeGraph evaluation corpus | CodeGraph has unit/integration fixtures; quality is unmeasured beyond those | — |
| ~~JS tests are ungated~~ **closed** | `tests/js/*.spec.mjs` runs via `box.json` `scripts.test` / `box run-script test` (`node --test tests/js/*.spec.mjs`) | — |

---

## Measured language tiers

Tiers are **earned, not declared**. `QualityGateService.advertisedLanguages()`
reports `measured: true` only when the seeded evaluation corpus has run and
passed; otherwise it reports the registry default with `measured: false`.

| Language | Registry default | Promoted to | On what |
|---|---|---|---|
| BoxLang | `unverified` | `parsed-dependency-aware` | `resources/evaluation-corpus/v1` passing its precision / recall / F1 / citation thresholds |
| ColdFusion | `discovery-only` | — | no corpus yet, so the tier cannot rise regardless of shipped depth |
| JavaScript | `discovery-only` | — | no corpus yet |

Do not raise a tier here by intention. Add a corpus, run the gate, and let the
promotion happen — the `measured` flag is what makes the claim honest.

---

## Where to go next

| Need | Open |
|---|---|
| Install / config | [`readme.md`](../../readme.md) |
| How Review / Modernize / CodeGraph are wired | [`technical-flow.md`](technical-flow.md) |
| Active implementation work | [`plans/codegraph-plan.md`](plans/codegraph-plan.md) |
| Prior Modernize inversion notes | [`plans/modernize-inversion-plan.md`](plans/modernize-inversion-plan.md) |
| Open issues | [`open-issues.md`](open-issues.md) |
| Prompt contract system | [`prompt-system.md`](prompt-system.md) |
| Service and repository ownership | [`app/models/README.md`](../../app/models/README.md) |
| HTTP contract | [`resources/apidocs/openapi.yaml`](../apidocs/openapi.yaml) |
| Agent working rules | [`AGENTS.md`](../../AGENTS.md) |
