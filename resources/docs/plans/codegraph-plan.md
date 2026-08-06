# CodeGraph — new top-menu section

> **For agentic workers:** execute in the order below; each step is independently
> verifiable. Prefer one task at a time with a green suite before the next.
> REQUIRED process: `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`.

**Goal:** Fourth workspace that turns the already-paid-for symbol/dependency
graph into an interactive CF/BoxLang knowledge-graph explorer.

**Architecture:** New `codegraph` runKind with its own pipeline (not a viewer
over review runs). Deterministic graph + optional LLM narrative layer. Hand-rolled
zero-dependency UMD renderer. Reuse coupling/cluster services — never copy them.

**Tech stack:** BoxLang/ColdBox, SQLite (`codegraph_snapshots`), existing review
graph tables, `codegraph-layout.js` UMD, desktop `app.js` workspace.

**Locked decisions:** new `codegraph` runKind · deterministic + optional LLM ·
hand-rolled UMD · CF/BoxLang only, JS skipped silently · additive runKind
branches for v1 (do **not** invent a half pipeline-registry; that is modernize
Part 5 Track A).

**Plan hygiene:** One live plan at a time
([resources/docs/README.md](../README.md)). When CodeGraph implementation
starts, this file becomes the sole live plan — delete
`modernize-inversion-plan.md` (or fold unfinished Part 5 notes into
`open-issues.md` first). Do not keep both readable.

### True project Overview (approved)

Landing is not “all clusters as a catalog”. Overview shows:
1. Project strip (name, blurb, file/module stats)
2. Top ~10 modules by size/connectivity (quieter cards)
3. “Show all modules” to expand; Files/Neighbourhood for drill

---

## Context

DoubleCheck today has three workspaces: Dashboard, Review, Modernize. Both Review
and Modernize already build a symbol/dependency graph of the project, but neither
exposes it. Review renders a deliberately tiny 14-node diagram
([architecture-flow.js:10](public/assets/architecture-flow.js:10)) next to a flat
fact list; Modernize computes a full coupling graph — fan-in/out, Tarjan cycles,
clusters — and then keeps only shape/counts
([ModernizationRunService.bx:136-146](app/models/services/ModernizationRunService.bx:136)).

CodeGraph turns that analysis into a product: analyze a project, build a knowledge
graph of every file, function, class, and dependency, and give an interactive
dashboard to explore it. ColdFusion and BoxLang only. The graph is deterministic
and works with no AI key; a configured provider adds plain-English module
summaries on top, clearly marked.

---

## What already exists (reuse, do not rebuild)

- [`ArchitectureIndexService.bx`](app/models/services/ArchitectureIndexService.bx:28)
  already builds exactly the wanted graph: dispatches to `BoxLangParserService` /
  `CfmlParserService`, content-addressed parse cache, symbols
  (`class|interface|function|property|handler-action|lifecycle-hook|route|test`),
  dependencies (`extends|implements|imports|includes|constructs|injects|calls|type-reference|tests`),
  cross-file `targetFile` resolution including DI aliases, bounded impact cone.
- Tables `analysis_artifact_cache`, `review_symbols`, `review_dependencies`,
  `review_graph_summaries`, `review_impacts` —
  [SchemaService.bx:454-538](app/models/services/SchemaService.bx:454).
- Run lifecycle: queue → lease → `transition()` → `review_events` → SSE +
  event-log replay + 2s poll fallback. All reusable unchanged. Services
  auto-register via models scan — **no WireBox binder entry**.
- [`ModernizationCouplingGraphService.bx`](app/models/services/ModernizationCouplingGraphService.bx)
  (fan-in/out, Tarjan SCC, bounded) and
  [`ModernizationDerivedStructureService.deriveClusters`](app/models/services/ModernizationDerivedStructureService.bx)
  (weighted modularity, cycle-safe). **Must be reused, not copied** —
  [ArchitectureFitnessSpec.bx:188-202](tests/specs/unit/ArchitectureFitnessSpec.bx:188)
  asserts exactly one file defines `stronglyConnectedComponents` and one defines
  `fanIn(`; [:175-186](tests/specs/unit/ArchitectureFitnessSpec.bx:175) does the
  same for `deriveClusters`. Duplicating any of them fails CI.
- Fingerprint precedent: coupling’s
  [`stableHash`](app/models/services/ModernizationCouplingGraphService.bx:119)
  (private at :477). Reuse the same pattern for snapshot fingerprints — do not
  invent a third hash style.

---

## Constraints found during exploration (each will bite silently)

1. [`AnalysisGraphRepository.getGraph`](app/models/repositories/AnalysisGraphRepository.bx:249)
   hard-caps at `graphResultLimit` = 1000 (property :9, Coldbox default). A
   whole-project read needs an optional per-call limit or the graph is silently
   clipped.
2. [`app.js:2073`](public/assets/app.js:2073) rewrites `state.workspace` to
   `"review"` for any runKind that isn't `"modernize"`. Breaks the whole
   CodeGraph workspace the moment a run opens.
3. [`app.js:4715-4725`](public/assets/app.js:4715) is an explicit SSE event-type
   allowlist — unlisted types never reach the client. Also update
   `eventLabels` (:122-147), `phaseLabels` (:99-120), `phasePipelineStage`
   (:158-179), and `pipelineLabels` (:181+) or progress chrome stays on review
   stages.
4. **Two** history allowlists — [`ApiHistory.bx:24-29`](app/handlers/ApiHistory.bx:24)
   **and** [`ReviewHistoryService.bx:82`](app/models/services/ReviewHistoryService.bx:82)
   — both validate `runKind` against `review|modernize`. ApiHistory returns
   **422** (not 400). Fixing only the handler still 422s/filters at the service.
5. Both parsers need `file.lines`, not `file.content` — CodeGraph cannot use
   Modernize's memory-light scan path. Memory, not CPU, is the large-repo limit.
6. `RepositoryScannerService` has no extension allowlist option; one must be
   added for "JS skipped silently".
7. `ModernizationDerivedStructureService` drops clusters whose inventory
   `unitIds` are empty (:98) — most `.cfm` templates unless the adapter emits a
   synthetic per-file unit. Its path normalize lowercases; keep a
   lowercase→canonical map.
8. **Export footgun:** [`ApiRuns.bx:364-366`](app/handlers/ApiRuns.bx:364) treats
   anything non-modernize as a **review** export. A codegraph run would silently
   get a findings-shaped report. v1 must **422** (or stub) until a real exporter
   exists.
9. **Cancel footgun:** [`ReviewRunService.bx:304-308`](app/models/services/ReviewRunService.bx:304)
   — non-modernize cancel calls `specialistReviewService.cancelRun`. CodeGraph
   must get its own branch (or a no-op cancel on `CodeGraphRunService`) so it
   does not touch specialists.
10. Dashboard history `<select>`
    ([dashboard.bxm:101-104](app/views/main/dashboard.bxm:101)) only lists
    Review/Modernize — API filter alone is invisible.
11. OpenAPI enums still `review|modernize`
    (`resources/apidocs/openapi.yaml` ~422, 805, 856, 1028 + public copies).
12. `app.js` has ~40 binary modernize/review branches; the dangerous ones below
    are required, not the full list. Touch only what CodeGraph needs; leave
    comparison/rerun chrome binary unless it breaks.

---

## Backend

### 1. Schema — one new table

[`SchemaService.bx`](app/models/services/SchemaService.bx): append
`codegraph_snapshots` to `tables` after `review_impacts` (ends :538), two entries
to `indexes` (after :873), and **an `orphanRepairs` DELETE** (after :321) or
`PRAGMA foreign_key_check` fails on existing DBs.

```
codegraph_snapshots(
  run_id TEXT PRIMARY KEY, snapshot_version TEXT NOT NULL,
  project_path TEXT, repository_revision TEXT, fingerprint TEXT,
  node_count, edge_count, cluster_count, cycle_count INTEGER,
  truncated INTEGER, truncation_reasons_json TEXT,
  snapshot_json TEXT, narrative_cache_key TEXT, narrative_json TEXT,
  created_at TEXT,
  FOREIGN KEY (run_id) REFERENCES review_runs(id) ON DELETE CASCADE )
```

**Conventions:** `snapshot_version = "codegraph-snapshot-v1"`. Fingerprint =
`stableHash( version & "|" & canonicalJson({ nodes, clusters, clusterEdges,
cycles, totals }) )` — same sorted-key discipline as coupling (:460). One
JSON-blob table matches `review_architecture_models` / `modernization_plans`.
Nothing queries clusters or hotspots by SQL predicate — the UI loads one run's
snapshot whole. `narrative_cache_key` + `project_path` + `repository_revision`
on the same row gives cross-run narrative reuse without a second cache table.
**Edges stay in `review_dependencies`** — do not duplicate them into the blob.

### 2. Shared runKind allowlist (small enhancement)

Today the allowlist is copy-pasted in `ReviewRunService`, `ApiHistory`,
`ReviewHistoryService`, and OpenAPI. Adding a third kind in three places will
drift. v1: introduce a tiny shared constant or helper used by those three
BoxLang sites (e.g. `ReviewRunKinds.bx` with `all()` / `isValid()`), and update
OpenAPI enums in the same step. Do **not** build the Part 5 pipeline registry
here — just stop the drift.

### 3. Pipeline

New [`CodeGraphRunService.bx`](app/models/services/CodeGraphRunService.bx)
mirroring `ModernizationRunService` — `ReviewRunService` is already 1138+ lines
and named in the fitness spec's over-900 list.

Edits to [`ReviewRunService.bx`](app/models/services/ReviewRunService.bx):
- **:118-121** accept `codegraph` (via shared allowlist); coerce
  `mode = "full"` **before** the mode check at :104 (a graph of a diff is
  meaningless). Add a `codegraph` branch beside modernize at :125 setting a
  minimal `runContract`, reusing `normalizeSelectedFiles`.
- **:358-364** scan options: `{ codegraph:true,
  allowedExtensions:["cfc","cfm","bx","bxm","bxs"],
  maxFiles/maxBytes/maxEntries from settings, checkCancellation }`.
  **Do not set `modernize:true`** — it drops `file.lines`.
- **after :470** (modernize's `return`), **before :471** (review-only branch):
  the codegraph dispatch block, structurally identical to :398-469 — callbacks
  struct, `execute()`, `saveSummary` as :443-451, terminal `transition`,
  `eventService.publish("codegraph.completed")`.
- **:59** inject `CodeGraphRunService`. **:304-308** cancel: three-way branch —
  modernize → `modernizationRunService.cancelRun`; codegraph →
  `codeGraphRunService.cancelRun` (no-op / future cancel token); else →
  `specialistReviewService.cancelRun`.

Phases (the shared scan already emits `phase.started`@5 and `review.indexed`):

| % | phase | event |
|---|---|---|
| 20 | `codegraph-index` | `codegraph.index` |
| 40 | `codegraph-metrics` | `codegraph.metrics` |
| 60 | `codegraph-clusters` | `codegraph.clusters` |
| 75 | `codegraph-narrative` | `codegraph.narrative` |
| 90 | `codegraph-persist` | — |
| 100 | `completed` | `codegraph.completed` |

`checkCancellation` + `renewOwnedLease` between every stage. Concurrent runs
share existing `runMaxConcurrent` — no new lease pool.

Two additive edits elsewhere:
- [`RepositoryScannerService.bx:188-192`](app/models/services/RepositoryScannerService.bx:188)
  — `allowedExtensions` option; non-matching files go to `skipped.unsupported`,
  already reported by `review.indexed`. Empty list = today's behavior.
- [`AnalysisGraphRepository.bx:249`](app/models/repositories/AnalysisGraphRepository.bx:249)
  — `getGraph( runId, numeric resultLimit = 0 )`, falling back to
  `variables.resultLimit`. Review path unchanged.

### 4. New services

- **`CodeGraphInventoryAdapter.bx`** — review-graph → coupling-inventory shape.
  `sourceFile→filePath`, `line→startLine`, `resolution:"path"`; edge kinds map to
  the coupling service's `structuralKinds` (`includes→include`;
  `constructs|injects|imports|calls|type-reference→component-construction`);
  **`tests` edges dropped** (they would fold every test into its subject's
  cluster). Emits one unit per symbol **plus a synthetic `file:` unit per
  scanned file**, and keeps a lowercase→canonical path map.
- **`CodeGraphMetricsService.bx`** — owns only what nothing else owns, and must
  not declare `fanIn(` or `stronglyConnectedComponents` (reads them off the
  `CouplingGraph` object): hotspots (weighted composite of
  fanIn/fanOut/symbolCount/lineCount/inCycle/crossing edges), orphans
  (`fanIn==0 && fanOut==0`, excluding entry points), layer violations, directory
  rollup, snapshot assembly + fingerprint. Reuse
  [`ArchitectureModelService.classifyFile`](app/models/services/ArchitectureModelService.bx:201)
  for component/entry-point classification rather than a second regex list —
  make the existing **private** method public, one keyword, no behavior change.
  Ship `layer` in the payload so the UMD module never recomputes it
  (`architecture-flow.js:layerRank` stays the only other owner).
- **`CodeGraphNarrativeService.bx`** — optional LLM. Copy the shape of
  [`ArchitectureEnrichmentService`](app/models/services/ArchitectureEnrichmentService.bx)
  exactly: `isEnabled()` / `cacheKey()` / **`enrich()`** (not `narrate`) /
  temperature 0 / structured output / one repair round / a `normalize()` that
  **drops any item citing an id not in the deterministic snapshot**. Public
  method name on CodeGraph may be `narrate()` if clearer, but mirror enrich’s
  internals. Output lives in its own top-level `narrative` key so AI prose can
  never merge into a deterministic field. No key / disabled / gateway throw →
  `{used:false, error:…}` and the run still ends **`succeeded`** — unlike
  Modernize, CodeGraph is not provider-gated. Prompt assets under
  `resources/prompts/roles|schemas/codegraph-narrative-v1*`, registered in
  `resources/prompts/manifest.json`.
- **`CodeGraphRepository.bx`** — save/get/`findReusableNarrative` (modelled on
  [`ArchitectureRepository.findBaseline`](app/models/repositories/ArchitectureRepository.bx:185)).

Reuse verdict on clusters: `deriveClusters` gives exactly what's wanted
(cycle-safe, deterministic, folder-shaped naming) plus
`couplingGraphService.cohesion()` for free. The CodeGraph presenter must strip
`placementType` / `rationale` — migration language that means nothing here. Do
**not** reuse `deriveWaveOrder`. The coupling caps (maxNodes 1500, maxEdges
20000, maxCycles 100) are class-body constants; v1 accepts them and surfaces
`truncated` / `truncationReasons` rather than editing a Modernize-critical file.

---

## HTTP surface

Reuse `POST /api/v1/runs` (`{runKind:"codegraph"}`), `GET /api/v1/runs/:id`,
`/events`, `/event-log`, `DELETE` (cancel, not hard-delete — CASCADE + orphan
repair still required), `/api/v1/history?runKind=codegraph`.

**`/api/v1/runs/:id/result`** — add a codegraph branch in
[`ReviewRunQueryService.bx:44-49`](app/models/services/ReviewRunQueryService.bx:44)
(this, not `ReviewRunService.getResult`, is the real dispatch). Payload:

```
codegraph: { version, fingerprint, truncated, truncationReasons,
  totals:{files,symbols,dependencies,nodes,edges,clusters,cycles,orphans,layerViolations},
  nodes:[{id,path,dir,component,layer,language,symbolCount,lineCount,fanIn,fanOut,clusterId,hotspotScore,inCycle}],
  clusters:[{id,key,label,fileCount,symbolCount,internalEdges,crossingEdges,cohesion,filePaths}],
  clusterEdges:[{from,to,weight,edgeCount}],
  cycles, hotspots, orphans, layerViolations, narrative }
```

**No raw edge list here** — 20 000 dependencies is several MB. Same class of
payload risk as modernization plans on `includeResult`
([ApiRuns.bx:91-93](app/handlers/ApiRuns.bx:91)).

**Export:** in [`ApiRuns.export`](app/handlers/ApiRuns.bx:364), if
`runKind == "codegraph"` → 422
`{ error: { code: "export_unsupported", message: "CodeGraph export is not available yet" } }`.
Do not fall through to `reportExportService`.

**Capabilities:** add to [`ApiCapabilities.bx`](app/handlers/ApiCapabilities.bx:42):
`runKinds: ["review","modernize","codegraph"]` and
`codegraph: { enabled: true, requiresLlm: false, schemaVersion: "codegraph-snapshot-v1" }`.
No settings UI for the new Coldbox caps — env-only for v1.

One new endpoint for drill-down, on a new handler
[`ApiCodeGraph.bx`](app/handlers/ApiCodeGraph.bx) (`ApiRuns.bx` is already 511
lines across three products) extending `RestHandler`, with the standard
`preHandler` security context and private `notFound()` / `validationError()`
copied from [ApiRuns.bx:496-509](app/handlers/ApiRuns.bx:496):

```
GET /api/v1/runs/:id/codegraph/subgraph?focus=&depth=1..3&limit=1..300&kinds=&include=
200 { data:{ focus, depth, truncated, totalNodes, totalEdges, nodes[], edges[] } }
404 run_not_found · 422 validation_failed
```

Router: subgraph route after the `/export` block (:110, before `/api/v1/runs/:id`
at :125); `/codegraph` page route after [:169](app/config/Router.bx:169). Add
`codegraph` to ApiHistory message text + ReviewHistoryService allowlist + shared
helper. Update `resources/apidocs/openapi.yaml` + `.json` and the cbswagger
`tags` in [`Coldbox.bx:348-360`](app/config/Coldbox.bx:348).

---

## Front end

- **Nav** — fourth `<a>` in [`Main.bxm`](app/layouts/Main.bxm) after the Modernize
  link (:38), same expression pattern; `:39` is currently `</nav>`.
- **Handler** — new action after [`Main.bx:48`](app/handlers/Main.bx:48),
  identical to `modernize()`, `prc.workspace = "codegraph"`, view
  `main/codegraph`.
- **View** — new `app/views/main/codegraph.bxm`: run form, progress, then a
  toolbar + SVG canvas host + inspector + issue tabs, all empty hosts the JS
  fills (the [review.bxm:516-563](app/views/main/review.bxm:516) pattern).
  Explicit empty / failed / truncated banners (hosts with copy the JS toggles) —
  not silent blank canvas.
- **Dashboard** — add `<option value="codegraph">CodeGraph</option>` in
  [dashboard.bxm:101-104](app/views/main/dashboard.bxm:101). History row label
  via existing `app.js` history chrome (:4816).
- **CSS** — add a focused block in `public/assets/app.css` (canvas host, toolbar,
  inspector, issue tabs, truncation notice, AI chip). Mirror nearby modernize /
  review panel spacing; desktop-only, no breakpoints. No new CSS file.
- **`public/assets/codegraph-layout.js`** — new UMD module, same wrapper as
  [`architecture-flow.js:1-7`](public/assets/architecture-flow.js:1), no
  `window`/`document`, so `node --test` drives it:

```js
buildClusterView(snapshot, opts)   buildFileView(snapshot, opts)
buildFocusView(subgraph, opts)     selectSubgraph(snapshot, {focus,depth,budget,kinds,includeTests})
layoutClusters(view, opts)         layoutLayered(view, opts)   layoutRadial(view, opts)
buildSvg(layout, opts) -> string   edgePath(a,b,opts)          nodeLabel(node,opts)
createViewport(...)  zoomAt(vp,point,factor,{min,max})  panBy(vp,dx,dy)
fitToBounds(vp,bounds,pad)  viewBoxOf(vp) -> "x y w h"  hitTest(layout,point) -> nodeId|""
```

  `DEFAULTS = { maxNodes:120, maxEdges:300, nodeWidth:180, nodeHeight:56, gapX:72, gapY:20, pad:24 }`.
  Every builder returns `truncated/totalNodes/totalEdges` — a capped graph must
  never read as complete.
- **`app.js` edits**, in order of danger:
  [:2073](public/assets/app.js:2073) three-way workspace (the silent killer) ·
  [:2-7](public/assets/app.js:2) `getCurrentWorkspace` ·
  [:4715-4725](public/assets/app.js:4715) SSE allowlist ·
  [:99-120](public/assets/app.js:99) `phaseLabels` ·
  [:122-147](public/assets/app.js:122) `eventLabels` ·
  [:158-179](public/assets/app.js:158) `phasePipelineStage` ·
  [:181+](public/assets/app.js:181) `pipelineLabels.codegraph` ·
  [:4479](public/assets/app.js:4479) `loadResult` and the binary workspace
  branches at :1993 / :2957 / :3763 · [:5758](public/assets/app.js:5758) form
  submit · [:4816](public/assets/app.js:4816) history labels · the `elements`
  block starting ~:1474 · new `renderCodeGraph(result)` + `state.codegraph`.
  All math and SVG-string building lives in the UMD module; target under ~300
  new lines in `app.js`.
- **Interaction** — click cluster → drill to file view (no fetch, re-render from
  the loaded snapshot); click file → select + inspector; second click → fetch
  `/subgraph` for the neighbourhood; click edge → inspector lists the
  `file:line` evidence behind it; breadcrumb drills out; issue tabs (Cycles /
  Orphans / Layer violations / Hotspots) select + centre. Filters: search,
  cluster, edge-kind chips, include-tests, node budget (60/120/240), layout
  (cluster/layer/radial), AI-summaries toggle. Keyboard `+`/`-`/`0`/`Esc`/arrows.
  **One delegated listener** on the SVG host reading `data-node-id`; pan/zoom
  only `setAttribute("viewBox", …)`, never a re-layout. Desktop-only, no
  breakpoints. SVG `role="img"` + `aria-label` on the canvas host is enough for
  v1; do not build a parallel non-SVG tree browser.
- **AI marking** — every AI string inside `[data-origin="ai"]` with a visible
  `AI` chip and `title="Generated by <provider>/<model> — not evidence"`. One
  toolbar toggle hides them all, which is also the proof nothing deterministic
  depends on them.
- **Cache-bust** ([Main.bxm](app/layouts/Main.bxm)) — `app.css` :19 `24→25`, new
  `codegraph-layout.js?v=local-oss-1` **before** the `app.js` tag (:52),
  `app.js` `25→26`.

---

## Performance bounds

Add beside the `graph*` block in
[`Coldbox.bx:110-119`](app/config/Coldbox.bx:110):
`codegraphScanMaxFiles` 2500 · `codegraphScanMaxBytes` 32MB ·
`codegraphScanMaxEntries` 30000 · `codegraphMaxNodes` 1500 ·
`codegraphMaxEdges` 20000 · `codegraphMaxClusters` 60 ·
`codegraphMaxHotspots` 50 · `codegraphMaxOrphans` 200 ·
`codegraphMaxLayerViolations` 200 · `codegraphSubgraphMaxNodes` 300 ·
`codegraphSubgraphMaxDepth` 3 · `codegraphNarrativeMaxClusters` 24 /
`MaxHotspots` 20 / `MaxCharacters` 30000. All env-overridable.

A 5000-file project: scan keeps ≤2500 CF/BX files (JS → `skipped.unsupported`,
overflow → `skipped.limit` + `discoveryTruncated`, both already surfaced). Memory
is the binding constraint because parsers need `file.lines` —
[RepositoryScannerService.bx:252-260](app/models/services/RepositoryScannerService.bx:252)
documents that overhead and [ApiRuns.bx:91-93](app/handlers/ApiRuns.bx:91)
documents the 512MB heap / large-result risk. Parse is content-addressed, so only
the first run pays. Read back with `getGraph(runId, codegraphMaxEdges)`. Metrics
cap → `truncated:true` + reasons. Snapshot ≈400KB. Render never draws 1500
nodes: cluster view ≤60, file view budgeted to 120, `/subgraph` ≤300.

---

## Tests

**Unit** (`tests/specs/unit/`) —
`CodeGraphInventoryAdapterSpec` (kind mapping, `tests` excluded, symbol-less
file still gets a unit, lowercase ids round-trip) ·
`CodeGraphMetricsServiceSpec` (fan-in read not recomputed; two-file cycle marks
both members; `Application.bx` and `tests/` files are not orphans;
`models/→handlers/` is a violation and the reverse is not; hotspot ranking
byte-stable; fingerprint stable under key-order shuffle; every cap sets
`truncated`) · `CodeGraphRunServiceSpec` (phase/progress/event sequence;
cancellation between stages; with narrative disabled the snapshot still has
clusters and the run ends `succeeded`) · `CodeGraphNarrativeServiceSpec` (no
key → zero gateway calls; unknown `clusterId` dropped; gateway throw never
mutates deterministic input; stable `cacheKey`) · `ReviewRunKindsSpec` (or
equivalent) for the shared allowlist.
Edits: add the new deterministic files to
[`ArchitectureFitnessSpec.bx:75-82`](tests/specs/unit/ArchitectureFitnessSpec.bx:75)
so they are gateway-checked; extend `ReviewRunSpec` for the new runKind and mode
coercion; cancel path does not call `specialistReviewService` for codegraph.

**Integration** — `CodeGraphApiSpec` (create → 202 + `Location`; `/result`
returns `codegraph.totals` and carries **no** raw edge list; `subgraph?limit=5`
→ ≤5 nodes + `truncated`; `limit=9999` → 422; bad id → 404;
`history?runKind=codegraph` → 200; `export` → 422 `export_unsupported`;
capabilities includes `runKinds` + `codegraph`) · `CodeGraphPersistenceSpec`
(table + indexes created; orphan repair leaves `PRAGMA foreign_key_check` clean;
save/read round-trip; narrative reuse by cache key) · `MainSpec` edit for
`GET /codegraph`.

**JS** (`tests/js/codegraph-layout.spec.mjs`, already gated by `box.json`
`scripts.test`) — budget never exceeded and `truncated` set when clipped; empty
input returns zero nodes without throwing; `layoutLayered` finite coords ordered
by `layer`; `zoomAt` keeps the cursor point fixed and respects min/max;
`fitToBounds`+`viewBoxOf` contain the bounds; `hitTest` returns `""` outside
nodes; module `require()`s with no `window`/`document`.

---

## Docs

`resources/docs/application-features.md` — CodeGraph purpose + features-today
sections after the Modernize pair; note in "computed but not surfaced" that the
coupling graph now has a UI **for CodeGraph only**; **fix the stale claim at
:234** that JS tests are ungated (they are gated by `box.json:49` /
`box run-script test`). Update "Where to go next" to point at this plan while
live.
`resources/docs/technical-flow.md` — `/codegraph` route, the subgraph endpoint, a
pipeline section with the phase table, `codegraph_snapshots` in the persistence
map, the four services, `codegraph-layout.js` in UI responsibilities.
`resources/docs/README.md` — replace the modernize plan row with this plan when
work starts (one live plan).
`app/models/README.md` — new CodeGraph group **plus the ownership note** that it
reuses `ModernizationCouplingGraphService` /
`ModernizationDerivedStructureService` rather than owning a second copy.
`readme.md` workspace list. OpenAPI per above.

---

## Out of scope for v1

- Settings UI for every `codegraph*` Coldbox cap (env-only)
- Real Markdown/JSON/SARIF export (422 stub only)
- Quality-gate / evaluation corpus for CodeGraph
- Hard-delete of runs; custom WireBox binder; LogBox category (optional later)
- `deriveWaveOrder`, second edge store, duplicating coupling algorithms
- Pipeline registry / `RunPipeline` (modernize Part 5) — land CodeGraph as
  additive branches; registry absorbs the third kind later
- Parallel non-SVG accessibility tree / mobile layout
- Rerun/compare UI specialized for codegraph (passthrough `runKind` is enough if
  create accepts it)

---

## Order of work

Each step independently verifiable; riskiest UI late.

1. **Schema + `CodeGraphRepository`** → `CodeGraphPersistenceSpec`. Nothing
   user-visible.
2. **Shared `ReviewRunKinds` allowlist** + wire into ReviewRunService /
   ApiHistory / ReviewHistoryService + OpenAPI enum. Tiny, unblocks everything.
3. **Adapter + metrics, offline** from a fixture graph struct — no run, no HTTP.
   Two unit specs + `ArchitectureFitnessSpec` still green. *Proves the reuse
   decision + fingerprint stability before anything depends on it.*
4. **Scanner `allowedExtensions` + `getGraph` optional limit** → existing specs
   unchanged.
5. **`codegraph` runKind + `CodeGraphRunService`** + cancel three-way +
   `ReviewRunQueryService` branch → real end-to-end run against the DoubleCheck
   repo itself. *Whole feature verifiable from `curl`, no UI.*
6. **`ApiCodeGraph` + routes + OpenAPI + export 422 + capabilities
   `runKinds`/`codegraph`** → `CodeGraphApiSpec`.
7. **UMD module + JS spec**, developed entirely under `node --test` against a
   JSON fixture captured from step 5's real run. No browser needed.
8. **View + nav + dashboard history option + `app.js` (incl. pipeline/event
   labels) + CSS + cache bumps** — first step that can visibly break existing
   pages, so it goes last among deterministic work.
9. **Narrative layer** — prompt assets, service, the 75% hook, AI chips +
   toggle. Additive: 1–8 must be complete and green with no key first.
10. **Docs** (+ delete superseded modernize plan if still present).

---

## Verification

```powershell
box testbox run
```

```powershell
box run-script test
```

End-to-end after step 5 (server already running):

```powershell
curl -s -X POST http://localhost:8080/api/v1/runs -H "Content-Type: application/json" -d "{\"runKind\":\"codegraph\",\"projectPath\":\"C:/Box/DoubleCheck\",\"mode\":\"full\"}"
```

Then poll `GET /api/v1/runs/<id>` to `succeeded` and inspect
`GET /api/v1/runs/<id>/result` for `data.result.codegraph.totals` (and confirm no
raw edge list). Capture that JSON as the fixture for step 7. Confirm
`GET .../export` → 422 and `GET /api/v1/capabilities` lists `codegraph`.

After step 8, drive the UI via the preview tools: load `/codegraph`, start a run
on this repo, confirm SSE phases advance, cluster→file drill-down and pan/zoom
work, the truncation notice appears when capped, and `/review` + `/modernize`
still render unchanged (the `app.js:2073` regression surface). Re-run with no AI
key configured to confirm the graph is complete and the AI chips are absent.

**Remember:** editing a `.bx` does nothing until `box server restart` — live
checks will silently run old code.

---

## Overview UX — Approach A (approved)

Camera-first polish toward Understand Anything’s clean overview → details funnel.
Phase C (search/filter chrome) is deferred and builds on A.

### A — ship now

1. **Pan:** drag-to-pan after ~6px move threshold (works on cards); middle-mouse
   and Alt+drag always pan. Do not require empty canvas.
2. **Camera toolbar:** Zoom − / Fit / Zoom +. Wheel and `+`/`-`/`0` remain.
   Fit on layout or depth change.
3. **Overview interaction:** click = select + inspector; drill to Files via
   Explore button, double-click, or Enter. No auto-drill on first click.
4. **Layout chrome:** Overview forces Cluster and hides Layer/Radial. Files /
   Neighbourhood show Cluster | Layer | Radial again.
5. **Card CTA copy:** “Click to inspect” (explore is explicit).

### C — later (not this pass)

Canvas search, layer/complexity filters, Fit-to-selection. No React Flow.

### Depth that teaches (approved)

P0: rich Files cards (fan-in/out, hotspot) · clickable inspector files →
neighbourhood · fix issue labels · neighbourhood edge kinds + focus highlight.

